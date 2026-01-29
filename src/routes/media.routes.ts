import { Router } from 'express';
import { uploadMiddleware, uploadFile, getFiles, deleteFile, getUploadSignature } from '../controllers/admin/media.controller.js';

const router = Router();

// Routes
router.get('/', getFiles);
router.get('/sign-upload', getUploadSignature);
router.post('/upload', uploadMiddleware, uploadFile);
router.delete('/:id', deleteFile);

export default router;
