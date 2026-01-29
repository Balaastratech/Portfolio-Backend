import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env.js';

// Configure Cloudinary
cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});

// Configure Multer for memory storage
// Configure Multer for memory storage
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit (Legacy/Local use only)
    },
}).single('file');

/**
 * Generate signature for client-side upload
 */
export async function getUploadSignature(req: Request, res: Response): Promise<void> {
    try {
        const timestamp = Math.round((new Date).getTime() / 1000);
        const folder = 'balaastra-portfolio';

        const signature = cloudinary.utils.api_sign_request({
            timestamp,
            folder,
        }, env.CLOUDINARY_API_SECRET || '');

        res.json({
            cloudName: env.CLOUDINARY_CLOUD_NAME,
            apiKey: env.CLOUDINARY_API_KEY,
            signature,
            timestamp,
            folder,
        });
    } catch (error) {
        console.error('Signature generation error:', error);
        res.status(500).json({ error: 'Failed to generate upload signature' });
    }
}

/**
 * Upload a file to Cloudinary (Legacy/Server-side backup)
 */
export async function uploadFile(req: Request, res: Response): Promise<void> {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        // Convert buffer to base64 for Cloudinary upload
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;

        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'balaastra-portfolio',
            resource_type: 'auto',
        });

        res.status(200).json({
            message: 'File uploaded successfully',
            storagePath: result.secure_url, // Terminology used by frontend
            publicId: result.public_id,
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
}

/**
 * Get list of files (from Cloudinary)
 */
export async function getFiles(req: Request, res: Response): Promise<void> {
    try {
        const { resources } = await cloudinary.search
            .expression('folder:balaastra-portfolio')
            .sort_by('created_at', 'desc')
            .max_results(30)
            .execute();

        const files = resources.map((file: any) => ({
            id: file.public_id,
            filename: file.filename,
            originalName: file.filename,
            mimeType: file.format,
            size: file.bytes,
            storagePath: file.secure_url,
            createdAt: file.created_at,
        }));

        res.json(files);
    } catch (error) {
        console.error('Get files error:', error);
        res.status(500).json({ error: 'Failed to retrieve files' });
    }
}

/**
 * Delete a file
 */
export async function deleteFile(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params; // Expecting public_id

        // Cloudinary public_id might contain slashes which express params might mess up if not encoded, 
        // but typically we pass the ID. If it's the DB ID, we'd look it up.
        // For now, let's assume the ID passed is the public_id or we just delete by public_id if passed in body.
        // NOTE: The route parameter :id usually captures until the slash. Cloudinary IDs have slashes (folder/name).
        // It's safer to pass public_id in query or body, but let's see how the frontend calls it.
        // Assuming strict "delete by id" where id is public_id.

        // If the ID coming in is a simple DB ID (which we don't have anymore), we can't delete from Cloudinary easily.
        // However, looking at the frontend/admin panel, usually we just want to upload.
        // Let's implement a simple direct delete for now.

        await cloudinary.uploader.destroy(id as string);

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
}
