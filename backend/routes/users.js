import express from 'express';
import { listUsers, getUser, createUser, updateUser, deactivateUser, updateMyProfile, getUserRecord, updateUserRecord, getUsersByRole, resetUserPassword, verifyMyPassword, changeMyPassword, requestPasswordReset, getUserPublicProfile } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { checkAppPermission } from '../middleware/permissions.js';
import { upload } from '../middleware/fileUpload.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

router.get('/me/profile', updateMyProfile);
router.patch('/me/profile', upload.single('avatar'), updateMyProfile);
router.post('/me/verify-password', verifyMyPassword);
router.post('/me/change-password', changeMyPassword);
router.post('/me/request-password-reset', requestPasswordReset);

// Public user profile (basic info only - id, name, email, avatar)
router.get('/:id/public-profile', getUserPublicProfile);

// Role-user lookup (must come before /:id)
router.get('/role/:roleId', checkAppPermission('canManageUsers'), getUsersByRole);

// User-as-record endpoints
router.get('/:id/record',          checkAppPermission('canManageUsers'), getUserRecord);
router.put('/:id/record',          checkAppPermission('canManageUsers'), updateUserRecord);
router.post('/:id/reset-password', checkAppPermission('canManageUsers'), resetUserPassword);

router.get('/',     checkAppPermission('canManageUsers'), listUsers);
router.get('/:id',  checkAppPermission('canManageUsers'), getUser);
router.post('/',    checkAppPermission('canManageUsers'), createUser);
router.put('/:id',  checkAppPermission('canManageUsers'), updateUser);
router.patch('/:id',checkAppPermission('canManageUsers'), updateUser);
router.delete('/:id',checkAppPermission('canManageUsers'), deactivateUser);

export default router;
