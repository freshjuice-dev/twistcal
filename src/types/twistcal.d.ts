/**
 * Type definitions for `@freshjuice/twistcal`.
 *
 * @example
 * ```ts
 * import { createButton, generateICS, googleUrl } from '@freshjuice/twistcal';
 *
 * const event = { title: 'Team Sync', start: '2026-01-15T10:00:00', end: '2026-01-15T11:00:00' };
 * createButton(document.getElementById('mount')!, event);
 * const ics = generateICS(event);
 * ```
 */

/** Calendar service identifier. `ics` and `ical` are aliases. */
export type CalendarAction = 'google' | 'outlook' | 'yahoo' | 'ics' | 'ical';

/** Event data passed to generators and the web component. */
export interface CalendarEvent {
  /** Event title (calendar subject). Required. */
  title: string;
  /** Start datetime — ISO 8601, any value `new Date()` understands. Required. */
  start: string;
  /** End datetime. Required. */
  end: string;
  /** Event description (calendar body). */
  description?: string;
  /** Event location. */
  location?: string;
  /** Event URL (included in .ics). */
  url?: string;
  /**
   * IANA timezone (e.g. `Europe/Oslo`). When set, naive `start`/`end`
   * (no offset) are interpreted as wall-clock in that zone, converted to UTC.
   * DST-aware via `Intl.DateTimeFormat`. Ignored if `start`/`end` already
   * carry an offset (`Z` or `+05:00`).
   */
  timezone?: string;
}

/** Attributes accepted by the `<twist-cal>` custom element. */
export interface TwistCalAttributes extends CalendarEvent {
  /** Button text. Default: auto-detected from `lang` or "Add to Calendar". */
  label?: string;
  /** Language code. Auto-detected from `<html lang>` or `navigator.language`. */
  lang?: string;
  /** Button style: `solid` (default) or `outline`. */
  variant?: 'solid' | 'outline';
  /** Show brand icons in dropdown. Default: `true`. */
  'show-icons'?: boolean | 'true' | 'false';
  /** Show calendar icon on button. Default: `true`. */
  'show-icon'?: boolean | 'true' | 'false';
  /** Comma-separated list of calendars to show, in order. Default: all four. */
  calendars?: string;
  /** Alias for `calendars`. */
  services?: string;
}

/** Translation for a single language. */
export interface Translation {
  /** Button label text. */
  label: string;
  /** Service names keyed by calendar action. */
  services: {
    google: string;
    outlook: string;
    yahoo: string;
    ical: string;
  };
}

// ── Generators ──────────────────────────────────────────────────────────

/** Generate an RFC 5545 ICS string. Returns `null` on invalid dates. */
export function generateICS(event: CalendarEvent): string | null;

/** Generate a Google Calendar compose URL. Returns `null` on invalid dates. */
export function googleUrl(event: CalendarEvent): string | null;

/** Generate an Outlook compose URL. Returns `null` on invalid dates. */
export function outlookUrl(event: CalendarEvent): string | null;

/** Generate a Yahoo Calendar compose URL. Returns `null` on invalid dates. */
export function yahooUrl(event: CalendarEvent): string | null;

/** Trigger a .ics file download via Blob URL. No-op if dates invalid. */
export function downloadICS(event: CalendarEvent): void;

// ── Internal helpers (exported for advanced use) ───────────────────────

/** Normalize event: convert naive start/end to UTC if timezone is set. */
export function normalizeEvent(event: CalendarEvent): CalendarEvent;

/** Parse a naive datetime string as wall-clock in `timezone`. Returns UTC Date. */
export function parseInTz(str: string, timezone: string): Date;

/** Get UTC offset (ms) for `timezone` at the UTC instant `utcMs`. */
export function tzOffsetMs(timezone: string, utcMs: number): number;

/** Escape text for ICS format. */
export function escapeICS(text: string): string;

/** Format a Date as ICS datetime string (e.g. `20260115T100000Z`). */
export function formatICSDate(date: Date): string | null;

/** RFC 5545 line folding at 75 octets. */
export function foldLine(line: string): string;

// ── Web component API ──────────────────────────────────────────────────

/** Mount a `<twist-cal>` element on a target element. */
export function createButton(target: HTMLElement, event: Partial<TwistCalAttributes>): HTMLElement;

/** Bind a click handler to an element, making it a calendar trigger. */
export function bindTrigger(el: HTMLElement, action: CalendarAction, event?: CalendarEvent): void;

/** Wire all `[data-twistcal]` elements in scope as calendar triggers. */
export function autoInit(scope?: HTMLElement | Document): void;

// ── i18n ───────────────────────────────────────────────────────────────

/** Auto-detect language from config, `<html lang>`, or `navigator.language`. */
export function detectLanguage(configLang?: string): string;

/** Get translation for a language code, falling back to English. */
export function getTranslation(lang: string): Translation;

/** List of supported language codes. */
export const supportedLanguages: string[];

/** Default export with all public functions. */
declare const TwistCal: {
  createButton: typeof createButton;
  bindTrigger: typeof bindTrigger;
  autoInit: typeof autoInit;
  generateICS: typeof generateICS;
  googleUrl: typeof googleUrl;
  outlookUrl: typeof outlookUrl;
  yahooUrl: typeof yahooUrl;
  downloadICS: typeof downloadICS;
};
export default TwistCal;

// ── Custom element declaration ─────────────────────────────────────────

interface TwistCalElement extends HTMLElement {
  // No public methods — all interaction is via attributes.
}
declare global {
  interface HTMLElementTagNameMap {
    'twist-cal': TwistCalElement;
  }
}