import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error({
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
    });

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({
                error: 'File Too Large',
                message: 'File size exceeds the allowed limit of 4.5MB. Please upload a smaller image.',
            });
            return;
        }
        res.status(400).json({
            error: 'Upload Error',
            message: err.message,
        });
        return;
    }

    res.status(500).json({
        error: 'Internal Server Error',
        message: env.isDevelopment ? err.message : 'An unexpected error occurred',
    });
};
