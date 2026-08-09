import terser from '@rollup/plugin-terser';
import alias from '@rollup/plugin-alias';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const terserOptions = {
  compress: { pure_getters: true, unsafe: true, unsafe_comps: true },
};

// IIFE outputs need named exports so TwistCal.createButton etc. are accessible
const iifeOutput = (file) => ({ file, format: 'iife', name: 'TwistCal', exports: 'named' });

const languages = ['en', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'uk', 'ru', 'ja', 'zh'];

// Alias translations + icons for a single-language, no-icons build
function slimLangAlias(lang) {
  return alias({
    entries: [
      {
        find: './i18n/translations.js',
        replacement: resolve(__dirname, `src/i18n/single/lang-${lang}.js`),
      },
      {
        find: '../i18n/translations.js',
        replacement: resolve(__dirname, `src/i18n/single/lang-${lang}.js`),
      },
      {
        find: './icons.js',
        replacement: resolve(__dirname, 'src/icons-empty.js'),
      },
    ],
  });
}

// Alias translations only (keep icons) for a single-language build
function langAlias(lang) {
  return alias({
    entries: [
      {
        find: './i18n/translations.js',
        replacement: resolve(__dirname, `src/i18n/single/lang-${lang}.js`),
      },
      {
        find: '../i18n/translations.js',
        replacement: resolve(__dirname, `src/i18n/single/lang-${lang}.js`),
      },
    ],
  });
}

// Icons-only alias (slim, no icons, all langs)
const slimAlias = alias({
  entries: [
    { find: './icons.js', replacement: resolve(__dirname, 'src/icons-empty.js') },
  ],
});

export default [
  // Generators-only IIFE — pure logic, no DOM component, no icons, no i18n
  {
    input: 'src/generators.js',
    output: iifeOutput('dist/twistcal.generators.min.js'),
    plugins: [terser(terserOptions)],
  },
  // Generators-only ESM
  {
    input: 'src/generators.js',
    output: { file: 'dist/twistcal.generators.esm.min.js', format: 'es' },
    plugins: [terser(terserOptions)],
  },

  // Full multilang (IIFE) — minified, for <script> tag
  {
    input: 'src/twistcal.js',
    output: iifeOutput('dist/twistcal.min.js'),
    plugins: [terser(terserOptions)],
  },
  // Full multilang (IIFE) — unminified, dev
  {
    input: 'src/twistcal.js',
    output: { ...iifeOutput('dist/twistcal.js'), sourcemap: true },
  },
  // Full multilang (ESM) — minified, for npm import
  {
    input: 'src/twistcal.js',
    output: { file: 'dist/twistcal.esm.min.js', format: 'es' },
    plugins: [terser(terserOptions)],
  },
  // Full multilang (ESM) — unminified, dev
  {
    input: 'src/twistcal.js',
    output: { file: 'dist/twistcal.esm.js', format: 'es', sourcemap: true },
  },

  // Slim — no icons, all langs (IIFE minified)
  {
    input: 'src/twistcal.js',
    output: iifeOutput('dist/twistcal.slim.min.js'),
    plugins: [slimAlias, terser(terserOptions)],
  },
  // Slim — no icons, all langs (ESM minified)
  {
    input: 'src/twistcal.js',
    output: { file: 'dist/twistcal.slim.esm.min.js', format: 'es' },
    plugins: [slimAlias, terser(terserOptions)],
  },

  // Per-language builds (minified IIFE + ESM, with icons)
  ...languages.flatMap(lang => [
    {
      input: 'src/twistcal.js',
      output: iifeOutput(`dist/twistcal.${lang}.min.js`),
      plugins: [langAlias(lang), terser(terserOptions)],
    },
    {
      input: 'src/twistcal.js',
      output: { file: `dist/twistcal.${lang}.esm.min.js`, format: 'es' },
      plugins: [langAlias(lang), terser(terserOptions)],
    },
  ]),

  // Per-language slim builds (minified IIFE, no icons)
  ...languages.flatMap(lang => [
    {
      input: 'src/twistcal.js',
      output: iifeOutput(`dist/twistcal.${lang}.slim.min.js`),
      plugins: [slimLangAlias(lang), terser(terserOptions)],
    },
  ]),
];