import { Router } from 'express';
import { uploadMiddleware, uploadFile, getFiles, deleteFile } from '../controllers/admin/media.controller.js';

const router = Router();

// Routes
router.get('/', getFiles);
router.post('/upload', uploadMiddleware, uploadFile);
router.delete('/:id', deleteFile);

export default router;
