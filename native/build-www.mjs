// Copies the web app into www/ for the native shell.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
const files = fs.readdirSync(root).filter(f => /\.(html|js|css|webmanifest)$/.test(f) && !['capacitor.config.json'].includes(f));
for (const f of files) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of ['icons', 'vendor']) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
console.log('www:', files.length, 'files + icons, vendor');
