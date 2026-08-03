/**
 * Descriptive statistics helpers.
 *
 * These are the plain-JavaScript equivalents of the pandas/NumPy computations
 * used by the Python analytics service in `backend/services/analytics_service.py`.
 * Keeping them here lets the dashboard render real statistics without a
 * round-trip while the Flask/ML backend is optional.
 */

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Mode of values rounded to the nearest integer bucket. */
export function mode(values: number[]): number {
  if (!values.length) return 0;
  const counts = new Map<number, number>();
  let best = Math.round(values[0]!);
  let bestCount = 0;
  for (const v of values) {
    const k = Math.round(v);
    const c = (counts.get(k) ?? 0) + 1;
    counts.set(k, c);
    if (c > bestCount) {
      bestCount = c;
      best = k;
    }
  }
  return best;
}

/** Sample variance (n - 1 denominator), matching pandas' default. */
export function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
}

export function stdDev(values: number[]): number {
  return Math.sqrt(variance(values));
}

/** Pearson correlation coefficient between two equal-length series. */
export function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i]! - ma;
    const y = b[i]! - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  const denom = Math.sqrt(da * db);
  return denom === 0 ? 0 : num / denom;
}

export function min(values: number[]): number {
  return values.length ? Math.min(...values) : 0;
}

export function max(values: number[]): number {
  return values.length ? Math.max(...values) : 0;
}

export function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
