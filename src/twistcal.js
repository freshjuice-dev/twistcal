/**
 * TwistCal — Lightweight "Add to Calendar" web component.
 * Zero dependencies. Shadow DOM. MIT.
 *
 * Usage (custom element):
 *   <twist-cal title="Team Sync" start="2026-01-15T10:00:00"
 *     end="2026-01-15T11:00:00" location="Room A"
 *     description="Weekly standup"></twist-cal>
 *
 * Usage (programmatic):
 *   import { createButton, generateICS, googleUrl, outlookUrl, yahooUrl } from './twistcal.js';
 *   createButton(document.getElementById('mount'), { title, start, end });
 */

// ── Timezone ────────────────────────────────────────────────────────────

// Get UTC offset (ms) for `timezone` at the UTC instant `utcMs`.
// Uses Intl to format the instant in the target tz, then reconstructs UTC
// from the formatted wall-clock fields. The difference is the offset.
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
  // Already has offset? Let Date parse natively.
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

function generateICS(event) {
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

function encode(text) {
  return encodeURIComponent(String(text || ''));
}

function googleUrl(event) {
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

function outlookUrl(event) {
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

function yahooUrl(event) {
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

function downloadICS(event) {
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

// ── Shadow DOM styles ───────────────────────────────────────────────────

const STYLES = `
:host {
  display: inline-block;
  font-family: var(--tc-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
.tc-wrap { position: relative; display: inline-block; }
.tc-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; font-size: 14px; font-weight: 600;
  color: var(--tc-text, #fff);
  background: var(--tc-btn-bg, #2563eb);
  border: none; border-radius: var(--tc-radius, 8px);
  cursor: pointer; transition: background 0.15s; line-height: 1;
}
.tc-btn:hover { background: var(--tc-btn-bg-hover, #1d4ed8); }
.tc-btn:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }
.tc-caret { display: inline-block; width: 0; height: 0;
  border-left: 4px solid transparent; border-right: 4px solid transparent;
  border-top: 5px solid currentColor; transition: transform 0.15s; }
.tc-wrap[open] .tc-caret { transform: rotate(180deg); }
.tc-menu {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 9999;
  min-width: 200px; background: #fff; border: 1px solid #e5e7eb;
  border-radius: var(--tc-radius, 8px); box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  padding: 4px; display: none;
}
.tc-wrap[open] .tc-menu { display: block; }
.tc-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; font-size: 14px; color: #1f2937;
  border: none; background: none; width: 100%; text-align: left;
  cursor: pointer; border-radius: 6px; text-decoration: none;
}
.tc-item:hover { background: #f3f4f6; }
.tc-item:focus-visible { outline: 2px solid #60a5fa; outline-offset: -2px; }
.tc-icon { width: 16px; height: 16px; flex-shrink: 0; }
`;

const ICONS = {
  google: '<svg class="tc-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>',
  outlook: '<svg class="tc-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h14v14H3z" opacity=".3"/><path d="M17 7v2h2v8h-2v2h4V7h-4zM7 9h6v6H7z"/></svg>',
  yahoo: '<svg class="tc-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L8 8h8L12 2zm0 4l-4 8h8l-4-8zm0 8l-3 6h6l-3-6z"/></svg>',
  ical: '<svg class="tc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
};

// ── Custom Element ───────────────────────────────────────────────────────

// Guard: the custom element only exists in a browser. In Node (tests, SSR),
// the class declaration is skipped — the generator exports still work.
let TwistCalElement = null;
if (typeof HTMLElement !== 'undefined') {
  TwistCalElement = class TwistCalElement extends HTMLElement {
  connectedCallback() {
    if (this._mounted) return;
    this._mounted = true;
    this._event = this._parseEvent();
    this._render();
  }

  _parseEvent() {
    // Support JSON in a child <script type="application/json">
    const script = this.querySelector('script[type="application/json"]');
    if (script) {
      try { return JSON.parse(script.textContent); } catch { /* fall through */ }
    }
    return {
      title: this.getAttribute('title'),
      start: this.getAttribute('start'),
      end: this.getAttribute('end'),
      description: this.getAttribute('description'),
      location: this.getAttribute('location'),
      url: this.getAttribute('url'),
      timezone: this.getAttribute('timezone'),
    };
  }

  _render() {
    const root = this.attachShadow({ mode: 'open' });
    const label = this.getAttribute('label') || 'Add to Calendar';
    root.innerHTML = `
      <style>${STYLES}</style>
      <div class="tc-wrap">
        <button class="tc-btn" type="button" aria-haspopup="menu" aria-expanded="false">
          <span>${label}</span>
          <span class="tc-caret" aria-hidden="true"></span>
        </button>
        <div class="tc-menu" role="menu">
          <a class="tc-item" role="menuitem" data-action="google" href="#" tabindex="0">${ICONS.google} Google Calendar</a>
          <a class="tc-item" role="menuitem" data-action="outlook" href="#" tabindex="0">${ICONS.outlook} Microsoft Outlook</a>
          <a class="tc-item" role="menuitem" data-action="yahoo" href="#" tabindex="0">${ICONS.yahoo} Yahoo Calendar</a>
          <a class="tc-item" role="menuitem" data-action="ics" href="#" tabindex="0">${ICONS.ical} Apple Calendar (.ics)</a>
        </div>
      </div>
    `;
    this._bind(root);
  }

  _bind(root) {
    const wrap = root.querySelector('.tc-wrap');
    const btn = root.querySelector('.tc-btn');
    const menu = root.querySelector('.tc-menu');

    btn.addEventListener('click', () => {
      const open = wrap.hasAttribute('open');
      wrap.toggleAttribute('open', !open);
      btn.setAttribute('aria-expanded', String(!open));
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target) && !root.contains(e.target)) {
        wrap.removeAttribute('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        wrap.removeAttribute('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.tc-item');
      if (!item) return;
      e.preventDefault();
      const action = item.dataset.action;
      this._dispatch(action);
      wrap.removeAttribute('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  _dispatch(action) {
    const ev = this._event;
    let url;
    switch (action) {
      case 'google':
        url = googleUrl(ev);
        if (url) window.open(url, '_blank', 'noopener');
        break;
      case 'outlook':
        url = outlookUrl(ev);
        if (url) window.open(url, '_blank', 'noopener');
        break;
      case 'yahoo':
        url = yahooUrl(ev);
        if (url) window.open(url, '_blank', 'noopener');
        break;
      case 'ics':
        downloadICS(ev);
        break;
    }
  }
  };
}

if (typeof customElements !== 'undefined' && TwistCalElement && !customElements.get('twist-cal')) {
  customElements.define('twist-cal', TwistCalElement);
}

// ── Programmatic API ─────────────────────────────────────────────────────

export function createButton(target, event) {
  const el = document.createElement('twist-cal');
  for (const [k, v] of Object.entries(event)) {
    if (v != null) el.setAttribute(k, String(v));
  }
  target.appendChild(el);
  return el;
}

// ── Declarative triggers ───────────────────────────────────────────────────
//
// Any element with [data-twistcal] becomes a calendar trigger.
// Event data is read from [data-twistcal-*] attributes on the same element.
// Action (google|outlook|yahoo|ics) is set via [data-twistcal-action].
//
//   <button data-twistcal
//     data-twistcal-action="google"
//     data-twistcal-title="Team Sync"
//     data-twistcal-start="2026-01-15T10:00:00"
//     data-twistcal-end="2026-01-15T11:00:00">Add to Google</button>
//
// Or pass an event object explicitly:
//   bindTrigger(btn, 'google', { title, start, end });

const TC_ATTR = 'data-twistcal';

function parseEventFromAttrs(el) {
  const get = (k) => el.getAttribute(`${TC_ATTR}-${k}`);
  return {
    title: get('title'),
    start: get('start'),
    end: get('end'),
    description: get('description'),
    location: get('location'),
    url: get('url'),
    timezone: get('timezone'),
  };
}

function fireAction(action, event) {
  switch (action) {
    case 'google': { const u = googleUrl(event); if (u) window.open(u, '_blank', 'noopener'); break; }
    case 'outlook': { const u = outlookUrl(event); if (u) window.open(u, '_blank', 'noopener'); break; }
    case 'yahoo': { const u = yahooUrl(event); if (u) window.open(u, '_blank', 'noopener'); break; }
    case 'ics': downloadICS(event); break;
  }
}

export function bindTrigger(el, action, event) {
  if (typeof document === 'undefined') return;
  const ev = event || parseEventFromAttrs(el);
  const act = action || el.getAttribute(`${TC_ATTR}-action`);
  el.addEventListener('click', (e) => {
    e.preventDefault();
    fireAction(act, ev);
  });
}

export function autoInit(scope) {
  if (typeof document === 'undefined') return;
  const root = scope || document;
  for (const el of root.querySelectorAll(`[${TC_ATTR}]`)) {
    if (el.tagName === 'TWIST-CAL') continue;
    if (el._tcBound) continue;
    el._tcBound = true;
    bindTrigger(el);
  }
}

// Auto-init on DOMContentLoaded (browser only, idempotent)
if (typeof document !== 'undefined') {
  const ready = () => autoInit();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }
}

export { generateICS, googleUrl, outlookUrl, yahooUrl, downloadICS };

export default { createButton, bindTrigger, autoInit, generateICS, googleUrl, outlookUrl, yahooUrl, downloadICS };