/**
 * TwistCal — Lightweight "Add to Calendar" web component.
 * Zero dependencies. Shadow DOM. Apache-2.0.
 *
 * Usage (custom element):
 *   <twist-cal title="Team Sync" start="2026-01-15T10:00:00"
 *     end="2026-01-15T11:00:00" location="Room A"
 *     description="Weekly standup"></twist-cal>
 *
 * Usage (programmatic):
 *   import { createButton, generateICS, googleUrl, outlookUrl, yahooUrl } from './twistcal.js';
 *   createButton(document.getElementById('mount'), { title, start, end });
 *
 * Generators only (no web component, no icons, no i18n):
 *   import { generateICS, googleUrl } from '@freshjuice/twistcal/generators';
 */

import { ICONS } from './icons.js';
import { detectLanguage, getTranslation, supportedLanguages } from './i18n/translations.js';
import {
  generateICS, googleUrl, outlookUrl, yahooUrl, downloadICS,
  normalizeEvent, parseInTz, tzOffsetMs, escapeICS, formatICSDate, foldLine,
} from './generators.js';

// ── Shadow DOM styles ───────────────────────────────────────────────────

const STYLES = `
:host {
  display: inline-block;
  font-family: var(--tc-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
.tc-wrap { position: relative; display: inline-block; }
.tc-btn {
  display: inline-flex; align-items: center; gap: var(--tc-btn-gap, 6px);
  padding: var(--tc-btn-padding, 8px 16px);
  font-size: var(--tc-btn-fs, 14px); font-weight: var(--tc-btn-fw, 600);
  color: var(--tc-text, #fff);
  background: var(--tc-btn-bg, #2563eb);
  border: var(--tc-btn-border, none);
  border-radius: var(--tc-radius, 8px);
  cursor: pointer; transition: background 0.15s; line-height: 1;
}
.tc-btn:hover { background: var(--tc-btn-bg-hover, #1d4ed8); }
.tc-btn:focus-visible { outline: var(--tc-focus, 2px solid #60a5fa); outline-offset: var(--tc-focus-offset, 2px); }
.tc-wrap[data-variant="outline"] .tc-btn {
  background: var(--tc-btn-bg, #fff);
  color: var(--tc-text, #111);
  border: 1px solid var(--tc-border, #111);
}
.tc-wrap[data-variant="outline"] .tc-btn:hover { background: var(--tc-btn-bg-hover, #f5f5f5); }
.tc-caret { display: inline-block; width: 0; height: 0;
  border-left: var(--tc-caret-size, 4px) solid transparent;
  border-right: var(--tc-caret-size, 4px) solid transparent;
  border-top: calc(var(--tc-caret-size, 4px) * 1.25) solid currentColor;
  transition: transform 0.15s; }
.tc-wrap[open] .tc-caret { transform: rotate(180deg); }
.tc-menu {
  position: absolute; top: calc(100% + var(--tc-menu-gap, 4px)); left: 0; z-index: 9999;
  min-width: var(--tc-menu-min-w, 200px);
  background: var(--tc-menu-bg, #fff);
  border: 1px solid var(--tc-menu-border, #e5e7eb);
  border-radius: var(--tc-radius, 8px);
  box-shadow: var(--tc-menu-shadow, 0 4px 16px rgba(0,0,0,0.12));
  padding: var(--tc-menu-padding, 4px); display: none;
}
.tc-wrap[open] .tc-menu { display: block; }
.tc-item {
  display: flex; align-items: center; gap: var(--tc-item-gap, 8px);
  padding: var(--tc-item-padding, 8px 12px);
  font-size: var(--tc-item-fs, 14px); color: var(--tc-item-color, #1f2937);
  border: none; background: none; width: 100%; text-align: left;
  cursor: pointer; border-radius: var(--tc-item-radius, 6px); text-decoration: none;
}
.tc-item:hover { background: var(--tc-item-hover-bg, #f3f4f6); }
.tc-item:focus-visible { outline: var(--tc-focus, 2px solid #60a5fa); outline-offset: var(--tc-focus-offset, -2px); }
.tc-icon { width: var(--tc-icon-size, 16px); height: var(--tc-icon-size, 16px); flex-shrink: 0; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.15)); }
.tc-btn-icon { width: var(--tc-btn-icon-size, 16px); height: var(--tc-btn-icon-size, 16px); flex-shrink: 0; opacity: var(--tc-btn-icon-opacity, 0.8); }
`;

// Calendar icon for the button — Phosphor-style, baked in, tiny
const BTN_ICON = '<svg class="tc-btn-icon" viewBox="0 0 256 256" fill="currentColor"><path d="M208 32H184V24a8 8 0 0 0-16 0v8H88V24a8 8 0 0 0-16 0v8H48A16 16 0 0 0 32 48V208a16 16 0 0 0 16 16H208a16 16 0 0 0 16-16V48A16 16 0 0 0 208 32ZM72 48v8a8 8 0 0 0 16 0V48h80v8a8 8 0 0 0 16 0V48h24V80H48V48ZM208 208H48V96H208V208Z"/></svg>';

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
    const lang = detectLanguage(this.getAttribute('lang'));
    const t = getTranslation(lang);
    const label = this.getAttribute('label') || t.label;
    const variant = this.getAttribute('variant') || 'solid';
    const showIcons = this.getAttribute('show-icons') !== 'false';
    const showBtnIcon = this.getAttribute('show-icon') !== 'false';
    const icon = (svg) => showIcons ? svg : '';
    const btnIcon = showBtnIcon ? BTN_ICON : '';
    const all = ['google', 'outlook', 'yahoo', 'ics'];
    const ikey = { google: 'google', outlook: 'outlook', yahoo: 'yahoo', ics: 'ical', ical: 'ical' };
    const calAttr = this.getAttribute('calendars') || this.getAttribute('services');
    const cals = calAttr
      ? calAttr.split(',').map(s => s.trim().toLowerCase()).filter(c => all.includes(c) || c === 'ical')
      : all;
    const items = cals.map(c => {
      const action = c === 'ical' ? 'ics' : c;
      const k = ikey[c] || c;
      return `<a class="tc-item" role="menuitem" data-action="${action}" href="#" tabindex="0">${icon(ICONS[k])} ${t.services[k]}</a>`;
    }).join('\n          ');
    root.innerHTML = `
      <style>${STYLES}</style>
      <div class="tc-wrap" data-variant="${variant}">
        <button class="tc-btn" type="button" aria-haspopup="menu" aria-expanded="false">
          ${btnIcon}<span>${label}</span>
          <span class="tc-caret" aria-hidden="true"></span>
        </button>
        <div class="tc-menu" role="menu">
          ${items}
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

    document.addEventListener('click', (e) => {
      if (!this.contains(e.target) && !root.contains(e.target)) {
        wrap.removeAttribute('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

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

// Re-export generators so `import { ... } from '@freshjuice/twistcal'` still works
export { generateICS, googleUrl, outlookUrl, yahooUrl, downloadICS, detectLanguage, getTranslation, supportedLanguages };

export default { createButton, bindTrigger, autoInit, generateICS, googleUrl, outlookUrl, yahooUrl, downloadICS };