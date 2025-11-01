import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '../src/config/curated-models.json');
const dst = path.join(__dirname, '../dist/src/config');
const versionSrc = path.join(__dirname, '../VERSION.json');
const versionDst = path.join(__dirname, '../dist');

fs.mkdirSync(dst, { recursive: true });
fs.copyFileSync(src, path.join(dst, 'curated-models.json'));
console.log('✓ Copied curated-models.json to dist');

fs.mkdirSync(versionDst, { recursive: true });
fs.copyFileSync(versionSrc, path.join(versionDst, 'VERSION.json'));
console.log('✓ Copied VERSION.json to dist');
