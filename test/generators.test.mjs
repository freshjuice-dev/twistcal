import { generateICS, googleUrl, outlookUrl, yahooUrl } from '../src/twistcal.js';
import assert from 'node:assert/strict';

const ev = {
  title: 'Test Event',
  start: '2026-01-15T10:00:00Z',
  end: '2026-01-15T11:00:00Z',
  description: 'Line one\nLine two',
  location: 'Room A, Bldg 2',
};

const ics = generateICS(ev);
assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'ICS starts with VCALENDAR');
assert.ok(ics.includes('SUMMARY:Test Event'), 'ICS has SUMMARY');
assert.ok(ics.includes('DESCRIPTION:Line one\\nLine two'), 'ICS escapes newlines');
assert.ok(ics.includes('LOCATION:Room A\\, Bldg 2'), 'ICS escapes commas');
assert.ok(ics.includes('BEGIN:VEVENT') && ics.includes('END:VEVENT'), 'ICS has VEVENT block');
assert.ok(/UID:[0-9TZ]+-[a-z0-9]+@twistcal/.test(ics), 'ICS has UID');

const g = googleUrl(ev);
assert.ok(g.startsWith('https://calendar.google.com/calendar/render?'), 'Google URL');
assert.ok(g.includes('action=TEMPLATE'), 'Google action=TEMPLATE');
assert.ok(g.includes('dates=20260115T100000Z%2F20260115T110000Z'), 'Google dates');

const o = outlookUrl(ev);
assert.ok(o.startsWith('https://outlook.live.com/calendar/0/deeplink/compose?'), 'Outlook URL');
assert.ok(o.includes('subject=Test+Event'), 'Outlook subject');

const y = yahooUrl(ev);
assert.ok(y.startsWith('https://calendar.yahoo.com/?'), 'Yahoo URL');
assert.ok(y.includes('st=20260115T100000Z'), 'Yahoo start');

// Bad input → null
assert.equal(generateICS({ start: 'not-a-date', end: 'also-bad' }), null, 'Bad dates → null');
assert.equal(googleUrl({ start: 'x', end: 'y' }), null, 'Bad Google → null');

// Timezone: 10:00 in Oslo (CET, UTC+1 in winter) → 09:00 UTC
const evTZ = { title: 'Oslo Meet', start: '2026-01-15T10:00:00', end: '2026-01-15T11:00:00', timezone: 'Europe/Oslo' };
const icsTZ = generateICS(evTZ);
assert.ok(icsTZ.includes('DTSTART:20260115T090000Z'), 'Oslo 10:00 → 09:00 UTC');
const gTZ = googleUrl(evTZ);
assert.ok(gTZ.includes('dates=20260115T090000Z%2F20260115T100000Z'), 'Google tz dates');

// LA (PST, UTC-8 in winter): 10:00 → 18:00 UTC previous day? No, same day 18:00
const evLA = { title: 'LA Meet', start: '2026-01-15T10:00:00', end: '2026-01-15T11:00:00', timezone: 'America/Los_Angeles' };
const icsLA = generateICS(evLA);
assert.ok(icsLA.includes('DTSTART:20260115T180000Z'), 'LA 10:00 PST → 18:00 UTC');

// Already-offset string + timezone attr: offset wins, tz ignored
const evOffset = { title: 'Z', start: '2026-01-15T10:00:00Z', end: '2026-01-15T11:00:00Z', timezone: 'Europe/Oslo' };
const icsOffset = generateICS(evOffset);
assert.ok(icsOffset.includes('DTSTART:20260115T100000Z'), 'Explicit Z overrides timezone');

// ── Declarative trigger parsing ─────────────────────────────────────────────
// parseEventFromAttrs is not exported; test via bindTrigger's fallback path.
// We test fireAction routing indirectly by verifying the URL generators it calls.
import { bindTrigger, autoInit } from '../src/twistcal.js';

// bindTrigger / autoInit are browser-only (need document); verify they no-op in Node.
assert.equal(typeof bindTrigger, 'function', 'bindTrigger exported');
assert.equal(typeof autoInit, 'function', 'autoInit exported');
// In Node (no document), bindTrigger should return undefined without throwing.
assert.equal(bindTrigger({}, 'google', ev), undefined, 'bindTrigger no-ops without document');

console.log('✓ All ICS + URL + timezone + trigger assertions passed');