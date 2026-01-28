
import { processUpload, deleteImage } from './src/services/image.service.js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars manually for this script since it's outside normal boot
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function test() {
    console.log('Testing Cloudinary Upload...');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);

    const dummyBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

    try {
        const result = await processUpload(dummyBuffer, 'test.gif');
        console.log('Upload Result:', result);

        console.log('Deleting...');
        // filename field stores the public_id now
        await deleteImage(result.filename);
        console.log('Delete Success');
    } catch (e) {
        console.error('Test Failed:', e);
    }
}

test();
