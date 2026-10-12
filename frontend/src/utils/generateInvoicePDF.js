import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const normalizePng = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const png = canvas.toDataURL('image/png');
      resolve({
        dataUrl: png,
        width: img.width,
        height: img.height,
      });
    };

    // Without this the promise never settles when the logo URL is broken, and
    // PDF generation hangs instead of falling back to a logo-less document.
    img.onerror = () => reject(new Error('Logo image failed to load'));

    img.src = src;
  });
};

/**
 * Turn the rich-text settings blobs (terms, payment instructions, footer…) into
 * plain text for jsPDF.
 *
 * Block-level tags carry the line break in HTML, so reading `textContent`
 * straight off the markup runs the last word of one block into the first word of
 * the next — "…terms applyPayment is due…". Convert the breaks to real newlines
 * first, then normalise whitespace.
 */
const stripHtml = (html) => {
  if (!html) return '';

  const div = document.createElement('div');
  div.innerHTML = String(html)
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|tr|blockquote|ul|ol|table)\s*>/gi, '\n');

  return (div.textContent || div.innerText || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const formatMoney = (value) => `R ${(Number(value) || 0).toFixed(2)}`;

/**
 * Customer-facing unit price for a line item.
 *
 * Line items store the cost in `unit_price` and the uplift in `markup_percent`
 * (that is how `subtotal` is derived: quantity * unit_price * (1 + markup/100)).
 * The document has to show the marked-up price, otherwise the unit price and the
 * line total on the same row disagree.
 */
const markedUpUnitPrice = (item) => {
  const base = Number(item?.unit_price) || 0;
  const markupPercent = Number(item?.markup_percent) || 0;
  return base * (1 + markupPercent / 100);
};

export const generateInvoicePDF = async (invoiceData, preview = false) => {
  const type = invoiceData?.objectApiName === 'quote' ? 'quote' : 'invoice';
  const typeLabel = type === 'invoice' ? 'Tax Invoice' : 'Quote';

  try {
    if (!invoiceData) throw new Error('No invoice data found');

    const doc = new jsPDF({
      compress: true,
      putOnlyUsedFonts: true,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 14;
    const rightMargin = pageWidth - 14;
    const contentWidth = rightMargin - leftMargin;

    // Two detail columns with a gutter between them, so a long company name or
    // email address wraps inside its own column instead of running across the
    // page into the other one.
    const leftColX = leftMargin;
    const rightColX = pageWidth / 2 + 2;
    const leftColWidth = rightColX - leftColX - 6;
    const rightColWidth = rightMargin - rightColX;

    const LINE = 6; // baseline step for 11pt body text
    // Content stops here so it can never land on the footer rule / footer text.
    const bottomLimit = pageHeight - 24;

    let finalY = 20;
    const ensureSpace = (spaceNeeded) => {
      if (finalY + spaceNeeded > bottomLimit) {
        doc.addPage();
        finalY = 20;
      }
    };

    // jsPDF advances multi-line text by its own internal line height, which
    // drifts from the manual y bookkeeping used throughout this layout. Drawing
    // one line at a time keeps the two in step.
    const writeLines = (lines, x, y, options) => {
      const arr = Array.isArray(lines) ? lines : [lines];
      arr.forEach((line, i) => doc.text(line, x, y + i * LINE, options));
      return y + arr.length * LINE;
    };

    // === Logo ===
    let logoHeight = 0;
    if (invoiceData.settings?.showLogoOnDocuments && invoiceData.settings?.companyLogo) {
      try {
        const logo = await normalizePng(invoiceData.settings.companyLogo);
        const maxWidth = 40;
        const aspectRatio = logo.width / logo.height;
        logoHeight = maxWidth / aspectRatio;
        doc.addImage(logo.dataUrl, 'PNG', leftMargin, 10, maxWidth, logoHeight);
      } catch (e) {
        console.warn('Failed to load logo:', e);
      }
    }

    // === Document Type & Number (right side of the header) ===
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(typeLabel, rightMargin, 16, { align: 'right' });

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');

    const docNumber = type === 'invoice'
      ? invoiceData.invoice_number || `INV-${invoiceData.id?.slice(-4)}`
      : invoiceData.quote_number || `QUO-${invoiceData.id?.slice(-4)}`;

    let metaY = 24;
    metaY = writeLines(
      doc.splitTextToSize(
        `${type === 'invoice' ? 'Invoice' : 'Quote'} #: ${docNumber}`,
        rightColWidth,
      ),
      rightMargin,
      metaY,
      { align: 'right' },
    );

    const docTitle = invoiceData.quote_name || invoiceData.invoice_name;
    if (docTitle) {
      metaY = writeLines(
        doc.splitTextToSize(String(docTitle), rightColWidth),
        rightMargin,
        metaY,
        { align: 'right' },
      );
    }

    const rawDocDate = invoiceData.quote_date || invoiceData.invoice_date;
    const docDate = rawDocDate ? new Date(rawDocDate) : null;
    if (docDate && !isNaN(docDate.getTime())) {
      metaY = writeLines(
        `Date: ${docDate.toLocaleDateString()}`,
        rightMargin,
        metaY,
        { align: 'right' },
      );
    }

    // Both detail columns start below whichever header block is taller. The
    // meta block used to be ignored here, so on a document with no logo the
    // client details landed on top of the document number and date.
    const startY = Math.max(10 + logoHeight, metaY) + 6;

    // === Detail columns ===
    const writeDetailColumn = (title, rows, x, width) => {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(title, x, startY);
      doc.setFont(undefined, 'normal');

      let y = startY + LINE + 1;
      rows
        .filter((row) => row !== undefined && row !== null && String(row).trim() !== '')
        .forEach((row) => {
          y = writeLines(doc.splitTextToSize(String(row), width), x, y);
        });
      return y;
    };

    const settings = invoiceData.settings || {};
    const ourAddress = [settings.street, settings.city, settings.country]
      .filter(Boolean)
      .join(', ');

    const contactName = invoiceData.client_name || settings.contactPersonName || settings.companyName;

    const ourY = writeDetailColumn(
      'Our Details',
      [
        settings.companyName,
        ourAddress,
        contactName && `Contact Name: ${contactName}`,
        settings.phoneNumber && `Phone: ${settings.phoneNumber}`,
        settings.emailAddress && `Email: ${settings.emailAddress}`,
      ],
      leftColX,
      leftColWidth,
    );

    const client = invoiceData.client || {};
    const clientY = writeDetailColumn(
      'Client Details',
      [
        client.name,
        client.billing_address,
        client.contact_person && `Contact Name: ${client.contact_person}`,
        client.phone && `Phone: ${client.phone}`,
        client.email && `Email: ${client.email}`,
      ],
      rightColX,
      rightColWidth,
    );

    // === Line Items Table ===
    const tableStartY = Math.max(ourY, clientY) + 9;

    const tableData = (invoiceData.lineItems || []).map((item) => {
      const qty = Number(item?.quantity ?? 1) || 0;
      const unitPrice = markedUpUnitPrice(item);
      const lineTotal = item?.subtotal !== undefined && item?.subtotal !== null
        ? Number(item.subtotal) || 0
        : unitPrice * qty;

      return [
        item?.product_name || item?.name || 'Product',
        String(qty),
        formatMoney(unitPrice),
        formatMoney(lineTotal),
      ];
    });

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: tableStartY,
        head: [['Product', 'Qty', 'Unit Price', 'Total']],
        body: tableData,
        margin: { left: leftMargin, right: leftMargin, bottom: 24 },
        styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { halign: 'left' },
        // Fixed widths for the numeric columns keep long product names wrapping
        // inside the first cell rather than pushing into the amounts.
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 16, halign: 'right' },
          2: { cellWidth: 32, halign: 'right' },
          3: { cellWidth: 34, halign: 'right' },
        },
      });

      finalY = doc.lastAutoTable.finalY + 10;
    } else {
      finalY = tableStartY + 10;
    }

    // === Totals ===
    // Label and amount are drawn as two right-aligned columns so a large amount
    // grows into its own 45mm column instead of over the label.
    const totalsLabelX = rightMargin - 45;
    const writeTotal = (label, value, { bold = false, size = 11 } = {}) => {
      ensureSpace(LINE + 2);
      doc.setFontSize(size);
      doc.setFont(undefined, bold ? 'bold' : 'normal');
      doc.text(label, totalsLabelX, finalY, { align: 'right' });
      doc.text(value, rightMargin, finalY, { align: 'right' });
      doc.setFont(undefined, 'normal');
      finalY += LINE;
    };

    writeTotal('Subtotal', formatMoney(invoiceData.sub_total));

    const discountAmount = Number(invoiceData.discount_amount) || 0;
    if (discountAmount > 0) {
      writeTotal('Discount', `-${formatMoney(discountAmount)}`);
    }

    if (settings.showTaxBreakdown) {
      writeTotal('VAT (15%)', formatMoney(invoiceData.tax_amount));
    }

    finalY += 3;
    writeTotal('Total', formatMoney(invoiceData.total), { bold: true, size: 13 });
    finalY += 10;

    // === Titled text sections ===
    // Takes already-plain text (callers run stripHtml on the rich-text settings).
    // jsPDF's text() does not paginate, so a long block has to be written line
    // by line with a page break where it would otherwise run off the bottom.
    const writeSection = (title, text) => {
      if (!text) return;

      const lines = doc.splitTextToSize(text, contentWidth);

      // Reserve the heading plus a line of body so a title is never orphaned at
      // the bottom of a page.
      ensureSpace(LINE * 3);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(title, leftMargin, finalY);
      doc.setFont(undefined, 'normal');
      finalY += LINE + 1;

      lines.forEach((line) => {
        ensureSpace(LINE);
        doc.text(line, leftMargin, finalY);
        finalY += LINE;
      });
      finalY += 5;
    };

    writeSection(
      'Terms & Conditions',
      stripHtml(type === 'invoice' ? settings.invoiceTerms : settings.quoteTerms),
    );

    writeSection('Payment Instructions', stripHtml(settings.paymentInstructions));

    // === Banking Details ===
    const showBanking = type === 'invoice'
      ? settings.showBankingDetailsOnInvoices
      : settings.showBankingDetailsOnQuotes;

    if (showBanking) {
      const bankingLines = [
        settings.bankName && `Bank: ${settings.bankName}`,
        settings.accountName && `Account Name: ${settings.accountName}`,
        settings.accountNumber && `Account Number: ${settings.accountNumber}`,
      ].filter(Boolean);

      if (bankingLines.length > 0) {
        writeSection('Banking Details', bankingLines.join('\n'));
      }
    }

    writeSection('Cancellation Policy', stripHtml(settings.cancellationPolicy));

    // === Footer ===
    const footerText = stripHtml(settings.invoiceFooter);
    if (footerText) {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');

      const footerLines = doc.splitTextToSize(footerText, contentWidth);

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(200);
        doc.line(leftMargin, pageHeight - 20, rightMargin, pageHeight - 20);

        footerLines.forEach((line, index) => {
          doc.text(line, pageWidth / 2, pageHeight - 15 + index * 4, {
            align: 'center',
          });
        });
      }
    }

    // Return preview URL or save
    if (preview) {
      const pdfBlob = doc.output('blob');
      return URL.createObjectURL(pdfBlob);
    }

    doc.save(`${typeLabel}-${docNumber}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
