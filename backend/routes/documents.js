import express from 'express';
import {
  generateQuoteFromDeal,
  generateInvoiceFromOrder,
  getQuote,
  getInvoice,
} from '../controllers/documentController.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

// Quote endpoints
router.post('/generate-quote', generateQuoteFromDeal);
router.get('/quotes/:quoteId', getQuote);

// Invoice endpoints
router.post('/generate-invoice', generateInvoiceFromOrder);
router.get('/invoices/:invoiceId', getInvoice);

export default router;
