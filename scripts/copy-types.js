#!/usr/bin/env node
/** Copy hand-written TypeScript declaration files into dist/. */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const COPIES = [
  ['src/types/twistcal.d.ts', 'dist/twistcal.d.ts'],
  ['src/types/generators.d.ts', 'dist/generators.d.ts'],
];

for (const [from, to] of COPIES) {
  const src = join(ROOT, from);
  const dest = join(ROOT, to);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`  ✓ ${from} -> ${to}`);
}