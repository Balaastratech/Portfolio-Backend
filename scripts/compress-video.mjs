// Make a web-ready copy of a video that fits the Cloudinary free-plan limit (100 MB per video).
// H.264 at CRF 26, at most 1080p, AAC 128k, "faststart" so it starts playing before it has fully loaded.
//   node scripts/compress-video.mjs <input.mp4> [output.mp4] [--crf 26]
// Needs ffmpeg on PATH. If the result is still over the limit it tries again with a higher CRF (smaller file).
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIMIT_MB = 100;
const mb = (bytes) => bytes / 1024 / 1024;

export function compressVideo(input, output, crf = 26) {
    const args = ['-y', '-loglevel', 'error', '-i', input,
        '-vf', "scale='min(1920,iw)':-2", '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf),
        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', output];
    const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
    if (r.error) throw new Error(`ffmpeg could not start (${r.error.message}). Install ffmpeg and put it on PATH.`);
    if (r.status !== 0) throw new Error(`ffmpeg failed with exit code ${r.status}`);
    return mb(statSync(output).size);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    const args = process.argv.slice(2);
    const crfAt = args.indexOf('--crf');
    let crf = crfAt >= 0 ? Number(args.splice(crfAt, 2)[1]) : 26;
    const [input, outArg] = args;
    if (!input) {
        console.error('Usage: node scripts/compress-video.mjs <input.mp4> [output.mp4] [--crf 26]');
        process.exit(1);
    }
    const output = outArg ?? input.replace(/(\.[^.]+)?$/, '-web.mp4');
    const before = mb(statSync(input).size);
    let after = compressVideo(input, output, crf);
    // ponytail: step CRF up until it fits; 3 tries covers demo-length videos, longer ones need a lower resolution.
    for (let i = 0; after > LIMIT_MB && i < 3; i++) {
        crf += 3;
        console.log(`Still ${after.toFixed(1)} MB, retrying at CRF ${crf}…`);
        after = compressVideo(input, output, crf);
    }
    console.log(`${path.basename(input)}: ${before.toFixed(1)} MB → ${after.toFixed(1)} MB (CRF ${crf}) → ${output}`);
    if (after > LIMIT_MB) {
        console.error(`Still over ${LIMIT_MB} MB. Use a YouTube or Loom link for this one.`);
        process.exit(2);
    }
}
