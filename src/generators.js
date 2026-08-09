/**
 * TwistCal — Calendar URL + ICS generators.
 * Pure logic, zero dependencies, no DOM access.
 * Can be imported standalone without the web component, icons, or i18n.
 *
 *   import { generateICS, googleUrl, outlookUrl, yahooUrl } from '@freshjuice/twistcal/generators';
 */

// ── Timezone ────────────────────────────────────────────────────────────

// Get UTC offset (ms) for `timezone` at the UTC instant `utcMs`.
function tzOffsetMs(timezone, utcMs) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const p = {};
  for (const part of parts) if (part.type !== 'literal') p[part.type] = part.value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
  return asUTC - utcMs;
}

// Parse a naive datetime string (no Z, no offset) as if it's wall-clock in `timezone`.
// Returns a Date in UTC. If the string already has an offset/Z, Date handles it natively.
function parseInTz(str, timezone) {
  const s = String(str);
  if (/[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return new Date(s);
  const fakeUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  const offset = tzOffsetMs(timezone, fakeUtc);
  return new Date(fakeUtc - offset);
}

// Normalize event: if timezone is set, convert naive start/end to UTC Dates.
function normalizeEvent(event) {
  if (!event.timezone) return event;
  return { ...event, start: parseInTz(event.start, event.timezone), end: parseInTz(event.end, event.timezone) };
}

// ── ICS ─────────────────────────────────────────────────────────────────

function escapeICS(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatICSDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

// RFC 5545 line folding: 75 octets, continuation prefixed with space
function foldLine(line) {
  if (line.length <= 75) return line;
  const chunks = [];
  let i = 0;
  while (i < line.length) {
    const slice = line.slice(i, i + 73);
    chunks.push((i === 0 ? '' : ' ') + slice);
    i += 73;
  }
  return chunks.join('\r\n');
}

export function generateICS(event) {
  const ev = normalizeEvent(event);
  const dtstart = formatICSDate(ev.start);
  const dtend = formatICSDate(ev.end);
  if (!dtstart || !dtend) return null;

  const dtstamp = formatICSDate(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TwistCal//Add to Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${dtstamp}-${Math.random().toString(36).slice(2, 10)}@twistcal`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
  ];
  if (event.title) lines.push(`SUMMARY:${escapeICS(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeICS(event.location)}`);
  if (event.url) lines.push(`URL:${escapeICS(event.url)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.map(foldLine).join('\r\n');
}

// ── Calendar URLs ────────────────────────────────────────────────────────

export function googleUrl(event) {
  const ev = normalizeEvent(event);
  const start = formatICSDate(ev.start);
  const end = formatICSDate(ev.end);
  if (!start || !end) return null;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || '',
    dates: `${start}/${end}`,
    details: event.description || '',
    location: event.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function outlookUrl(event) {
  const ev = normalizeEvent(event);
  const start = new Date(ev.start);
  const end = new Date(ev.end);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const params = new URLSearchParams({
    subject: event.title || '',
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: event.description || '',
    location: event.location || '',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}

export function yahooUrl(event) {
  const ev = normalizeEvent(event);
  const start = formatICSDate(ev.start);
  if (!start) return null;
  const durMs = new Date(ev.end).getTime() - new Date(ev.start).getTime();
  const hours = Math.floor(durMs / 3600000);
  const mins = Math.floor((durMs % 3600000) / 60000);
  const dur = `${String(hours).padStart(2, '0')}${String(mins).padStart(2, '0')}`;
  const params = new URLSearchParams({
    v: '60', view: 'd', type: '20',
    title: event.title || '',
    st: start,
    dur,
    desc: event.description || '',
    in_loc: event.location || '',
  });
  return `https://calendar.yahoo.com/?${params}`;
}

// ── Download .ics ────────────────────────────────────────────────────────

export function downloadICS(event) {
  const ics = generateICS(event);
  if (!ics) return;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (event.title || 'event').replace(/[^\w-]+/g, '_') + '.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { normalizeEvent, parseInTz, tzOffsetMs, escapeICS, formatICSDate, foldLine };