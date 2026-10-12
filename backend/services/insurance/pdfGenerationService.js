/**
 * PDF generation service for policy documents.
 *
 * Converts HTML documents to PDF using a headless browser (Puppeteer) or
 * a PDF generation service. Falls back gracefully if PDF generation is
 * unavailable (e.g., in environments without headless browser support).
 */

import logger from '../../utils/logger.js';

let puppeteer = null;
let puppeteerAvailable = false;

// Lazy-load puppeteer to avoid startup failures in environments without it
const loadPuppeteer = async () => {
  if (puppeteerAvailable) return puppeteer;
  if (puppeteer === null) {
    try {
      puppeteer = await import('puppeteer');
      puppeteerAvailable = true;
    } catch (err) {
      logger.warn('Puppeteer not available - PDF generation will be disabled:', err.message);
      puppeteerAvailable = false;
    }
  }
  return puppeteer;
};

/**
 * Generate a PDF from HTML content.
 *
 * @param {string} html - The HTML content to convert
 * @param {object} options - PDF generation options
 * @param {string} options.format - Paper format (e.g., 'A4', 'Letter')
 * @param {object} options.margin - Page margins
 * @param {boolean} options.printBackground - Print background colors/images
 * @returns {Promise<Buffer|null>} PDF buffer or null if generation failed
 */
export const generatePDF = async (html, options = {}) => {
  const puppeteer = await loadPuppeteer();
  if (!puppeteerAvailable) {
    return null;
  }

  const browser = await puppeteer.default.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      margin: options.margin || { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: options.printBackground !== false,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } catch (err) {
    logger.error('PDF generation failed:', err.message);
    return null;
  } finally {
    await browser.close();
  }
};

/**
 * Generate both HTML and PDF versions of a policy document.
 * Returns both buffers.
 */
export const generatePolicyDocumentBuffers = async (tenantId, userId, policyId, type, policyDocumentService) => {
  const { generatePolicyDocument } = policyDocumentService;

  // First generate the HTML document
  const htmlResult = await generatePolicyDocument({ tenantId, userId, policyId, type });

  // Then generate PDF from the HTML
  const pdfBuffer = await generatePDF(htmlResult.content);

  return {
    html: htmlResult.content,
    pdf: pdfBuffer,
    file: htmlResult.file,
  };
}

/**
 * Check if PDF generation is available.
 */
export const isPDFAvailable = () => puppeteerAvailable;

export default {
  generatePDF,
  generatePolicyDocumentBuffers,
  isPDFAvailable,
};