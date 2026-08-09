/**
 * Generate single-language translation files.
 * Run with: node scripts/build-langs.js
 */

import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { translations } from '../src/i18n/translations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const singleDir = join(__dirname, '../src/i18n/single');

mkdirSync(singleDir, { recursive: true });

for (const [lang, translation] of Object.entries(translations)) {
  const jsContent = `/**
 * ${lang.toUpperCase()} only translation — auto-generated
 * Do not edit manually, run: npm run build
 */
export const translations = {
  ${lang}: ${JSON.stringify(translation, null, 2).split('\n').join('\n  ')}
};

export const supportedLanguages = ['${lang}'];

export function detectLanguage() {
  return '${lang}';
}

export function getTranslation() {
  return translations.${lang};
}
`;

  writeFileSync(join(singleDir, `lang-${lang}.js`), jsContent);
  console.log(`Generated: src/i18n/single/lang-${lang}.js`);
}

console.log(`\nGenerated ${Object.keys(translations).length} languages`);