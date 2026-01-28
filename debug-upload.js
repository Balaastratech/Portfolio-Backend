
import jwt from 'jsonwebtoken';
// import fetch from 'node-fetch'; // Native fetch in Node 18+

// Config
const SECRET = 'dev-secret-change-in-production';
const BASE_URL = 'http://localhost:3001/api';

// Create a dummy token
const token = jwt.sign(
    { userId: 'test-admin', role: 'admin', permissions: { media: true } },
    SECRET,
    { expiresIn: '1h' }
);

console.log('Using Token:', token);

// Create a dummy image
const dummyImage = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

async function upload() {
    try {
        const body = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test-pixel.gif"\r\nContent-Type: image/gif\r\n\r\n`),
            dummyImage,
            Buffer.from(`\r\n--${boundary}--`)
        ]);

        const res = await fetch(`${BASE_URL}/admin/media/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: body
        });

        if (!res.ok) {
            console.error('Upload Failed:', res.status, res.statusText);
            const text = await res.text();
            console.error('Response:', text);
            return;
        }

        const data = await res.json();
        console.log('Upload Success:', data);
    } catch (e) {
        console.error('Error:', e);
    }
}

upload();
