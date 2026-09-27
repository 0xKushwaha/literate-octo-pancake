import { brand as defaultBrand } from '../data/site';
import { parseDayKey } from './slots';

/**
 * Builds an RFC 5545 .ics file for a confirmed booking, entirely in the
 * browser — no calendar provider is contacted, so nothing about the
 * appointment leaves the device unless the person imports it themselves.
 */

/** Local wall-clock stamp; paired with TZID so DST is the calendar's problem. */
function stamp(date, time) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

function utcStamp(d = new Date()) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Long lines must be folded at 75 octets, continuation lines start with a space. */
function fold(line) {
  if (line.length <= 74) return line;
  const out = [line.slice(0, 74)];
  let rest = line.slice(74);
  while (rest.length > 73) {
    out.push(' ' + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  if (rest) out.push(' ' + rest);
  return out.join('\r\n');
}

/** COMMA, SEMICOLON, BACKSLASH and newlines are the escapable set. */
function esc(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Fills {name} placeholders; unknown names are left as they are. */
const fill = (text, vars) => String(text ?? '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));

/** The wording the invite uses when the admin copy has not loaded. */
const DEFAULT_COPY = {
  calendar_video: 'Secure video link — sent by email',
  calendar_matched: 'with your matched therapist',
  success_with: 'with {therapist}',
  calendar_title: 'Therapy session {who}',
  calendar_body: 'Your {brand} session {who}.\nReference {reference}.\nReschedule or cancel free of charge up to 24 hours beforehand: {phone}',
  calendar_reminder: '{brand} session in one hour',
  timezone: 'America/Los_Angeles',
};

/**
 * `brand` and `copy` are the admin's (Brand & contact, Booking); both fall
 * back to the built-in wording so a calendar file can always be made.
 */
export function buildIcs({
  reference, dateKey, time, durationMin = 50, therapistName, format, brand = defaultBrand, copy = {},
}) {
  const c = { ...DEFAULT_COPY, ...Object.fromEntries(Object.entries(copy).filter(([, v]) => v !== '' && v != null)) };
  const tz = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/.test(c.timezone) ? c.timezone : DEFAULT_COPY.timezone;
  const start = parseDayKey(dateKey);
  const startStamp = stamp(start, time);

  const [h, m] = time.split(':').map(Number);
  const end = new Date(start);
  end.setHours(h, m + durationMin, 0, 0);
  const endStamp = stamp(end, `${end.getHours()}:${end.getMinutes()}`);

  const where = format === 'inperson' ? brand.address : c.calendar_video;
  const who = therapistName ? fill(c.success_with, { therapist: therapistName }) : c.calendar_matched;
  const vars = { brand: brand.name, who, reference, phone: brand.phone || brand.email || '' };
  const host = typeof window !== 'undefined' ? window.location.host : 'booking';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${brand.name} Therapy//Booking//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${reference}@${host}`,
    `DTSTAMP:${utcStamp()}`,
    `DTSTART;TZID=${tz}:${startStamp}`,
    `DTEND;TZID=${tz}:${endStamp}`,
    `SUMMARY:${esc(fill(c.calendar_title, vars))}`,
    `DESCRIPTION:${esc(fill(c.calendar_body, vars).replace(/\\n/g, '\n'))}`,
    `LOCATION:${esc(where)}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(fill(c.calendar_reminder, vars))}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(ics, reference) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `booking-${reference}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // revoke on the next tick so the download has definitely started
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
