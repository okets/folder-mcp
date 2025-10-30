import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '../src/config/curated-models.json');
const dst = path.join(__dirname, '../dist/src/config');

fs.mkdirSync(dst, { recursive: true });
fs.copyFileSync(src, path.join(dst, 'curated-models.json'));
console.log('✓ Copied curated-models.json to dist');
