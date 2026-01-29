import express from 'express';
import cors from 'cors';
import { env, validateEnv } from './config/env.js';
import { testConnection } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import adminRoutes from './routes/admin.routes.js';
import path from 'path';
import { securityHeaders, globalLimiter, authLimiter } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';

// Validate environment variables
validateEnv();

const app = express();

// Trust proxy for rate limiting behind reverse proxies
// Trust proxy for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Security Middleware
app.use(securityHeaders);
app.use(globalLimiter);

// Middleware
app.use(cors({
    origin: [
        ...(env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : []),
        'http://localhost:5173',
        'http://localhost:8080',
        'http://localhost:8081',
        'http://192.168.31.31:8081',
        'http://192.168.31.31:5173',
        'http://localhost:5174'
    ],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
    });
});

// API version info
app.get('/api', (_req, res) => {
    res.json({
        name: 'BalaAstraTech Portfolio API',
        version: '1.0.0',
        endpoints: {
            public: '/api/public/*',
            admin: '/api/admin/*',
        },
    });
});

// Static Files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/admin/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
    });
});

// Error handler
// Error handler
app.use(errorHandler);

// Start server
// Start server
async function start() {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.error('❌ Failed to connect to database. Please check your DATABASE_URL.');
        process.exit(1);
    }

    app.listen(env.PORT, () => {
        console.log(`\n🚀 Server running on http://localhost:${env.PORT}`);
        console.log(`   Environment: ${env.NODE_ENV}`);
        console.log(`   CORS origin: ${env.CORS_ORIGIN}`);
        console.log(`\n📍 Auth endpoints:`);
        console.log(`   POST /api/admin/auth/login`);
        console.log(`   POST /api/admin/auth/logout`);
        console.log(`   GET  /api/admin/auth/verify`);
        console.log(`   POST /api/admin/auth/change-password`);
        console.log(`   POST /api/admin/auth/verify-email`);
        console.log(`   POST /api/admin/auth/resend-verification`);
        console.log(`   POST /api/admin/auth/forgot-password`);
        console.log(`   POST /api/admin/auth/reset-password\n`);
    });
}

// Only start the server if we are not in a serverless environment (Vercel)
// Vercel sets NODE_ENV=production but does not run the script directly via node/tsx
// We can check if the file is being run directly
import { fileURLToPath } from 'url';

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
    start();
}

export default app;
