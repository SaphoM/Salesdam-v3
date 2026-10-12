import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';
import {
  generateQuote,
  generateInvoice,
  getQuoteDetails,
  getInvoiceDetails,
} from '../services/documentService.js';
import { audit } from '../utils/auditLogger.js';

/**
 * POST /api/documents/generate-quote
 * Generate a quote from a deal
 */
const generateQuoteFromDeal = asyncHandler(async (req, res) => {
  const { dealId } = req.body;

  if (!dealId) {
    throw new AppError('dealId is required', 400);
  }

  const quote = await generateQuote(req.tenantId, dealId, req.user._id);

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'generate',
    resource: 'Quote',
    resourceId: quote.id,
    details: { dealId },
  });

  sendSuccess(res, { data: quote }, 'Quote generated successfully');
});

/**
 * POST /api/documents/generate-invoice
 * Generate an invoice from an order
 */
const generateInvoiceFromOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    throw new AppError('orderId is required', 400);
  }

  const invoice = await generateInvoice(req.tenantId, orderId, req.user._id);

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'generate',
    resource: 'Invoice',
    resourceId: invoice.id,
    details: { orderId },
  });

  sendSuccess(res, { data: invoice }, 'Invoice generated successfully');
});

/**
 * GET /api/documents/quotes/:quoteId
 * Get quote details for viewing/PDF generation
 */
const getQuote = asyncHandler(async (req, res) => {
  const { quoteId } = req.params;

  if (!quoteId) {
    throw new AppError('quoteId is required', 400);
  }

  const quoteData = await getQuoteDetails(req.tenantId, quoteId);

  sendSuccess(res, { data: quoteData });
});

/**
 * GET /api/documents/invoices/:invoiceId
 * Get invoice details for viewing/PDF generation
 */
const getInvoice = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;

  if (!invoiceId) {
    throw new AppError('invoiceId is required', 400);
  }

  const invoiceData = await getInvoiceDetails(req.tenantId, invoiceId);

  sendSuccess(res, { data: invoiceData });
});

export {
  generateQuoteFromDeal,
  generateInvoiceFromOrder,
  getQuote,
  getInvoice,
};
