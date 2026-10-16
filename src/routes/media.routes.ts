import { Router } from 'express';
import { uploadMiddleware, uploadFile, getFiles, deleteFile, getUploadSignature } from '../controllers/admin/media.controller.js';

import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Was open to anyone: upload signatures and file deletes now need a logged-in admin.
router.use(authMiddleware);

// Routes
router.get('/', getFiles);
router.get('/sign-upload', getUploadSignature);
router.post('/upload', uploadMiddleware, uploadFile);
router.delete('/:id', deleteFile);

export default router;
