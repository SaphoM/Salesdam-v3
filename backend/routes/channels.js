import express from 'express';
import {
  listAccounts,
  capabilities,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  webhook,
} from '../controllers/channelController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = express.Router();

// Public inbound webhook: verified by the channel account's signing secret,
// not by a session, so it must be reachable without authentication (§16.2).
router.post('/webhook/:channel/:accountId', webhook);

router.get('/capabilities', requireAuth, enforceTenant, capabilities);

router.use(requireAuth, enforceTenant, requireAdmin);
router.get('/', listAccounts);
router.post('/', createAccount);
router.get('/:id', getAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;
