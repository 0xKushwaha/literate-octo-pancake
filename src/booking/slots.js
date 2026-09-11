/**
 * Deterministic fake availability. Same therapist + same day always yields the
 * same slots, so the UI stays stable across re-renders and reloads without
 * needing a backend.
 */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Local-calendar key. toISOString() would shift the date by a day for anyone
 * east of UTC, so the chip and the heading below it would disagree.
 */
export function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Inverse of dayKey — `new Date(key)` would parse as UTC midnight. */
export function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The next `count` bookable days, skipping Sundays. */
export function upcomingDays(count = 14, from = new Date()) {
  const days = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);
  while (days.length < count) {
    if (cursor.getDay() !== 0) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

const ALL_TIMES = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
];

export function slotsFor(therapistId, date) {
  const seed = hash(`${therapistId ?? 'any'}::${dayKey(date)}`);
  const rand = rng(seed);
  const saturday = date.getDay() === 6;
  const pool = saturday ? ALL_TIMES.slice(0, 8) : ALL_TIMES;
  // roughly a third to two-thirds of the day is open
  return pool.filter(() => rand() > (saturday ? 0.55 : 0.42));
}

export function formatDay(date) {
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    day: date.getDate(),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    full: date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
  };
}

export function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/**
 * @deprecated The booking reference is now issued server-side by /api/booking,
 * so a client cannot choose its own or collide with an existing booking. Kept
 * only for the demo-mode path in lib/queries/bookings.js.
 */
export function makeReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `LMN-${out}`;
}
