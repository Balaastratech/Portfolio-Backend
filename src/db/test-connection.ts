import { testConnection, closeConnection } from '../config/database.js';
import { validateEnv } from '../config/env.js';

async function main() {
    console.log('🔍 Testing database connection...\n');

    try {
        validateEnv();
        const connected = await testConnection();

        if (connected) {
            console.log('\n✅ Database connection test passed!');
            process.exit(0);
        } else {
            console.log('\n❌ Database connection test failed!');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

main();
