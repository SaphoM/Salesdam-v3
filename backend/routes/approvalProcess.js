import express from 'express';
import {
  listProcesses,
  getProcess,
  createProcess,
  updateProcess,
  deleteProcess,
  submitForApproval,
  approveRequest,
  rejectRequest,
  recallRequest,
  getRecordState,
  listMyPending,
} from '../controllers/approvalProcessController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

// Runtime routes (any authenticated user) — declared before '/:id'.
router.post('/submit', submitForApproval);
router.get('/state', getRecordState);
router.get('/pending/mine', listMyPending);
router.post('/:id/approve', approveRequest);
router.post('/:id/reject', rejectRequest);
router.post('/:id/recall', recallRequest);

// Process configuration (admin only).
router.get('/', requireAdmin, listProcesses);
router.post('/', requireAdmin, createProcess);
router.get('/:id', requireAdmin, getProcess);
router.put('/:id', requireAdmin, updateProcess);
router.delete('/:id', requireAdmin, deleteProcess);

export default router;
