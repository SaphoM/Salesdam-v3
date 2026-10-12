import express from 'express';
import { listRoles, getRole, createRole, updateRole, deleteRole, assignRole, removeRole } from '../controllers/roleController.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { checkAppPermission } from '../middleware/permissions.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

router.get('/', listRoles);
router.get('/:id', getRole);
router.post('/', checkAppPermission('canManageRoles'), createRole);
router.put('/:id', checkAppPermission('canManageRoles'), updateRole);
router.delete('/:id', checkAppPermission('canManageRoles'), deleteRole);
router.post('/assign', checkAppPermission('canManageRoles'), assignRole);
router.post('/remove', checkAppPermission('canManageRoles'), removeRole);

export default router;
