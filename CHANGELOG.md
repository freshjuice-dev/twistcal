# Changelog

## [1.0.0] — 2026-08-09

First stable release. Zero-dependency "Add to Calendar" web component with Shadow DOM.

### Added
- **Web component** `<twist-cal>` with dropdown button (Google, Outlook, Yahoo, .ics)
- **Declarative triggers** via `data-twistcal` attributes on any element
- **Programmatic API** — import generators and URL builders directly
- **12 languages** with auto-detection from `lang` attribute, `<html lang>`, or `navigator.language`
- **Button variants** — `solid` (default) and `outline` (white bg, dark border)
- **Calendar selection** — `calendars="google,ics"` to pick which services to show
- **Icon toggles** — `show-icons` (dropdown) and `show-icon` (button), both on by default
- **Brand SVG icons** — Google Calendar (classic "31"), Outlook, Yahoo, Apple Calendar
- **Full CSS theming** — 25+ `--tc-*` custom properties for every visual value
- **Slim builds** — no icons, drops ~8 KB (19 KB → 11 KB)
- **Generators split** — `src/generators.js` importable without the web component (3 KB)
- **TypeScript declarations** — `.d.ts` for full and generators builds
- **All-day events** — `all-day="true"` attribute, date-only ICS and Google/Yahoo formats
- **Event callback** — `twistcal:add` CustomEvent with `{ action, event }` detail
- **Custom calendar services** — `addCalendar(id, label, icon, urlFn)` API
- **Keyboard navigation** — ArrowUp/Down, Home/End, Escape, auto-focus first item
- **Branding** — "Powered by TwistCal" link in dropdown, `branding="false"` to hide
- **Calendar icon** on the button, using `currentColor`, baked into all builds
- **Icon drop-shadow** for better visibility on dropdown background
- **Rollup build** — 46 dist files: full/slim/per-lang/generators (IIFE + ESM)
- **Release workflow** — GHA builds on tag, auto-detects prerelease, attaches artifacts
- **Timezone support** — DST-aware via `Intl.DateTimeFormat`, IANA names
- **JSON event data** — `<script type="application/json">` inside `<twist-cal>`

### Build variants
| File | Format | Size | Icons | Languages |
|------|--------|------|-------|-----------|
| `dist/twistcal.min.js` | IIFE | 19 KB | Yes | All 12 |
| `dist/twistcal.slim.min.js` | IIFE | 11 KB | No | All 12 |
| `dist/twistcal.esm.min.js` | ESM | 19 KB | Yes | All 12 |
| `dist/twistcal.generators.esm.min.js` | ESM | 3 KB | — | — |

### CDN
All CDN links use jsdelivr: `https://cdn.jsdelivr.net/npm/@freshjuice/twistcal/dist/twistcal.min.js`

### License
Apache-2.0 © [FreshJuice](https://freshjuice.dev)