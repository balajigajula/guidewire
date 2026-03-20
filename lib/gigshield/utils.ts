export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function roundToStep(n: number, step: number) {
  return Math.round(n / step) * step;
}

export function inr(n: number) {
  const value = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getIsoWeekKey(date = new Date()) {
  // ISO week date algorithm: https://en.wikipedia.org/wiki/ISO_week_date
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function minutesFromNow(minutes: number) {
  return Date.now() + minutes * 60_000;
}

