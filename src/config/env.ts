import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Environment configuration with validation
export const env = {
    // Database
    DATABASE_URL: process.env.DATABASE_URL || '',

    // Server
    PORT: parseInt(process.env.PORT || '3001', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',

    // JWT (Phase 2)
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

    // File Upload (Phase 6)
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',

    // CORS
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

    // Email (Resend)
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    FROM_EMAIL: process.env.FROM_EMAIL || 'onboarding@resend.dev',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'balaastratech@gmail.com',
    ADMIN_PANEL_URL: process.env.ADMIN_PANEL_URL || 'http://localhost:5174',

    // Helpers
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
} as const;

// Validate required environment variables
export function validateEnv(): void {
    const required = ['DATABASE_URL'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

export default env;
