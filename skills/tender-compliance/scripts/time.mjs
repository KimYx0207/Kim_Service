import { requireValue as assert } from './runtime.mjs';

export function instant(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/u.exec(value);
  assert(m, 'Timestamp needs ISO date, time and timezone');
  const [, y, mo, d, h, mi, s, tz] = m;
  const year = Number(y), month = Number(mo), day = Number(d);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  assert(month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] && Number(h) < 24 && Number(mi) < 60 && Number(s) < 60, 'Invalid calendar timestamp');
  if (tz !== 'Z') assert(Number(tz.slice(1,3)) <= 14 && Number(tz.slice(4)) < 60 && (Number(tz.slice(1,3)) !== 14 || Number(tz.slice(4)) === 0), 'Invalid timezone offset');
  const time = Date.parse(value); assert(Number.isFinite(time), 'Invalid timestamp'); return time;
}
