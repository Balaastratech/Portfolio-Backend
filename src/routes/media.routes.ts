import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { uploadMiddleware, uploadFile, getFiles, deleteFile } from '../controllers/admin/media.controller.js';

const router = Router();

// Protect all media routes
router.use(authMiddleware);

router.get('/', requirePermission('media'), getFiles);
router.post('/upload', requirePermission('media'), uploadMiddleware, uploadFile);
router.delete('/:id', requirePermission('media'), deleteFile);

export default router;
