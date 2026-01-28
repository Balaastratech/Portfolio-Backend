import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});

export interface ProcessedImage {
    filename: string; // We'll save public_id here
    originalName: string;
    mimeType: string;
    size: number;
    path: string; // We'll save secure_url here
}

/**
 * Process uploaded file:
 * - Upload to Cloudinary
 * - Cloudinary automatically handles storage and optimization
 */
export async function processUpload(buffer: Buffer, originalName: string): Promise<ProcessedImage> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'portfolio',
                resource_type: 'auto',
            },
            (error, result) => {
                if (error) return reject(error);
                if (!result) return reject(new Error('Upload failed'));

                resolve({
                    filename: result.public_id, // Store public_id in filename field
                    originalName,
                    mimeType: `${result.resource_type}/${result.format}`,
                    size: result.bytes,
                    path: result.secure_url, // Store full URL in path
                });
            }
        );

        uploadStream.end(buffer);
    });
}

/**
 * Delete image file from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Cloudinary delete error:', error);
    }
}
