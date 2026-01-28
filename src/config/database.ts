import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from './env.js';
import * as schema from '../db/schema.js';

const { Pool } = pg;

// Create PostgreSQL connection pool
export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20, // Maximum number of connections in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if no connection
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Create Drizzle ORM instance with schema
export const db = drizzle(pool, { schema });

// Test database connection
export async function testConnection(): Promise<boolean> {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Database connected successfully at:', result.rows[0].now);
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}

// Graceful shutdown
export async function closeConnection(): Promise<void> {
    await pool.end();
    console.log('Database connection pool closed');
}

export default db;
