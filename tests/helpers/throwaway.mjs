// Throwaway Postgres for tests and local preview: PGlite (Postgres compiled to WASM) in memory,
// served over the normal Postgres wire protocol so the real app code (pg + drizzle) runs unchanged.
// Nothing is written to disk and nothing can reach the live database.
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function freePort() {
    return new Promise((resolve) => {
        const s = net.createServer().listen(0, '127.0.0.1', () => {
            const { port } = s.address();
            s.close(() => resolve(port));
        });
    });
}

// Block every outbound HTTP call (Resend email, Cloudinary) so tests can never send or upload anything.
function blockOutboundFetch() {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
        const url = new URL(typeof input === 'string' ? input : input.url);
        if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return realFetch(input, init);
        return new Response(JSON.stringify({ message: `blocked outbound call to ${url.hostname} (test)` }),
            { status: 503, headers: { 'content-type': 'application/json' } });
    };
}

export async function startThrowaway({ appPort } = {}) {
    const pg = await PGlite.create(); // in-memory
    const dbPort = await freePort();
    const server = new PGLiteSocketServer({ db: pg, port: dbPort, host: '127.0.0.1', maxConnections: 40 });
    await server.start();

    // Explicit env wins over any backend/.env (dotenv never overrides existing variables).
    process.env.DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${dbPort}/postgres`;
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'throwaway-test-secret';
    process.env.RESEND_API_KEY = 're_throwaway_not_a_key';
    process.env.CLOUDINARY_CLOUD_NAME = 'throwaway';
    process.env.CLOUDINARY_API_KEY = 'throwaway';
    process.env.CLOUDINARY_API_SECRET = 'throwaway';
    if (new URL(process.env.DATABASE_URL).hostname !== '127.0.0.1') throw new Error('refusing: not a local DB');
    blockOutboundFetch();

    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    const { db, pool } = await import('../../dist/src/config/database.js');
    await migrate(db, { migrationsFolder: path.join(backendDir, 'migrations') });
    const { default: app } = await import('../../dist/src/index.js');

    const httpServer = await new Promise((resolve, reject) => {
        const s = app.listen(appPort ?? 0, '127.0.0.1', (err) => (err
            ? reject(new Error(`Port ${appPort} is already in use. Stop the other preview or set PREVIEW_PORT to a free port.`))
            : resolve(s)));
    });
    const baseUrl = `http://127.0.0.1:${httpServer.address().port}`;

    async function stop() {
        await new Promise((r) => httpServer.close(r));
        await pool.end();
        await server.stop();
        await pg.close();
    }
    return { db, pool, pg, baseUrl, stop, backendDir };
}

/** Insert an active, verified admin directly (the register flow needs real email). */
export async function createAdmin(db, { email, password, role = 'super_admin', permissions }) {
    const { adminUsers, SUPER_ADMIN_PERMISSIONS } = await import('../../dist/src/db/schema.js');
    const { hashPassword } = await import('../../dist/src/utils/password.js');
    const [user] = await db.insert(adminUsers).values({
        email, name: email.split('@')[0], role, status: 'active', isEmailVerified: true,
        passwordHash: await hashPassword(password),
        permissions: permissions ?? SUPER_ADMIN_PERMISSIONS,
    }).returning();
    return user;
}
