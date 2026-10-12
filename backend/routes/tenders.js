import express from 'express';
import {
  searchTenders,
  saveTenderAsLead,
  convertTenderToDeal,
  getDocumentProxy,
} from '../controllers/tendersController.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

router.get('/search', searchTenders);
router.post('/save-as-lead', saveTenderAsLead);
router.post('/convert-to-deal', convertTenderToDeal);
router.get('/document-proxy', getDocumentProxy);

export default router;