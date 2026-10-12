import express from 'express';
import { globalSearch, suggest } from '../controllers/searchController.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);
router.get('/', globalSearch);
router.get('/suggest', suggest);

export default router;
