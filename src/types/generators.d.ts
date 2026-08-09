/**
 * Type definitions for `@freshjuice/twistcal/generators`.
 * Pure logic — no web component, no icons, no i18n.
 *
 * @example
 * ```ts
 * import { generateICS, googleUrl } from '@freshjuice/twistcal/generators';
 *
 * const event = { title: 'Team Sync', start: '2026-01-15T10:00:00', end: '2026-01-15T11:00:00' };
 * const ics = generateICS(event);
 * ```
 */

/** Event data passed to generators. */
export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  url?: string;
  timezone?: string;
}

export function generateICS(event: CalendarEvent): string | null;
export function googleUrl(event: CalendarEvent): string | null;
export function outlookUrl(event: CalendarEvent): string | null;
export function yahooUrl(event: CalendarEvent): string | null;
export function downloadICS(event: CalendarEvent): void;

export function normalizeEvent(event: CalendarEvent): CalendarEvent;
export function parseInTz(str: string, timezone: string): Date;
export function tzOffsetMs(timezone: string, utcMs: number): number;
export function escapeICS(text: string): string;
export function formatICSDate(date: Date): string | null;
export function foldLine(line: string): string;