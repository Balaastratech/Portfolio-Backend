import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { mediaUploads } from '../../db/schema.js';
import { upload } from '../../config/multer.js';
import { processUpload, deleteImage } from '../../services/image.service.js';
import { eq, desc } from 'drizzle-orm';

// Helper to handle Multer upload
export const uploadMiddleware = upload.single('file');

/**
 * POST /api/admin/media/upload
 * Upload to Cloudinary
 */
export async function uploadFile(req: Request, res: Response): Promise<void> {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        // Process image (Upload to Cloudinary)
        const processed = await processUpload(req.file.buffer, req.file.originalname);

        // Save to DB
        // Note: filename stores public_id, storagePath stores secure_url
        const [record] = await db.insert(mediaUploads).values({
            filename: processed.filename,
            originalName: req.file.originalname,
            mimeType: processed.mimeType,
            fileSize: processed.size,
            storagePath: processed.path,
            uploadedBy: req.user?.userId || null,
        }).returning();

        res.status(201).json(record);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
}

/**
 * GET /api/admin/media
 * List all uploaded files
 */
export async function getFiles(_req: Request, res: Response): Promise<void> {
    try {
        const files = await db
            .select()
            .from(mediaUploads)
            .orderBy(desc(mediaUploads.createdAt));

        res.json(files);
    } catch (error) {
        console.error('List media error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * DELETE /api/admin/media/:id
 * Delete a file
 */
export async function deleteFile(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;

        const [file] = await db
            .select()
            .from(mediaUploads)
            .where(eq(mediaUploads.id, id));

        if (!file) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        // Check usage
        if (file.usageRefs && (file.usageRefs as any[]).length > 0) {
            res.status(400).json({ error: 'File is in use and cannot be deleted' });
            return;
        }

        // Delete from DB
        await db.delete(mediaUploads).where(eq(mediaUploads.id, id));

        // Delete from Cloudinary (using filename which stores public_id)
        await deleteImage(file.filename);

        res.json({ message: 'File deleted' });
    } catch (error) {
        console.error('Delete media error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
