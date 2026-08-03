import { availabilityLevel, occupancyPct, type AvailabilityLevel, type ParkingRecord } from "./parking";
import { mean } from "./stats";

/**
 * DEMO / SIMULATED DATA GENERATOR
 * --------------------------------
 * Everything produced here is synthetic. It exists so the dashboard, the
 * statistics engine and the ML page can be demonstrated before a real camera
 * or the Python detection backend is connected. Anything rendered from these
 * values must be labelled "DEMO / SIMULATED DATA" in the UI.
 */

/** Typical weekday demand curve (0-1) indexed by hour of day. */
const HOUR_PROFILE = [
  0.12, 0.09, 0.07, 0.07, 0.08, 0.14, 0.26, 0.45, 0.68, 0.82, 0.88, 0.9, 0.86, 0.83, 0.85, 0.89, 0.92,
  0.87, 0.72, 0.58, 0.44, 0.33, 0.24, 0.17,
];

/** Weekend demand is lower and peaks later. */
const DAY_FACTOR = [0.72, 1.0, 1.02, 1.0, 1.03, 1.06, 0.84]; // Sun..Sat

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function expectedOccupancyRatio(hour: number, dayOfWeek: number) {
  const base = HOUR_PROFILE[hour] ?? 0.4;
  return Math.min(0.99, base * (DAY_FACTOR[dayOfWeek] ?? 1));
}

/** Generate hourly simulated occupancy history for the past `days` days. */
export function generateHistory(capacity: number, days = 14, seed = 42): ParkingRecord[] {
  const rand = seededRandom(seed + capacity);
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const out: ParkingRecord[] = [];
  for (let h = days * 24 - 1; h >= 0; h--) {
    const ts = new Date(now.getTime() - h * 3600_000);
    const ratio = expectedOccupancyRatio(ts.getHours(), ts.getDay());
    const noise = (rand() - 0.5) * 0.14;
    const occupied = Math.max(0, Math.min(capacity, Math.round(capacity * (ratio + noise))));
    out.push({
      id: `demo-${h}`,
      area_id: "demo",
      recorded_at: ts.toISOString(),
      occupied,
      available: capacity - occupied,
      occupancy_percentage: occupancyPct(occupied, capacity),
      source: "demo",
    });
  }
  return out;
}

/** Simulate one detection frame: how many of the given slots look occupied. */
export function simulateFrame(slotCount: number, at = new Date()) {
  const ratio = expectedOccupancyRatio(at.getHours(), at.getDay());
  const jitter = (Math.random() - 0.5) * 0.12;
  const occupied = Math.max(0, Math.min(slotCount, Math.round(slotCount * (ratio + jitter))));
  return { occupied, available: slotCount - occupied, detections: occupied };
}

/* ------------------------------------------------------------------ */
/* Demo ML model: multiple linear regression (ordinary least squares)  */
/* ------------------------------------------------------------------ */

export type TrainedModel = {
  weights: number[];
  featureNames: string[];
  importance: { name: string; value: number }[];
  r2: number;
  rmse: number;
  samples: number;
  version: string;
};

const FEATURE_NAMES = [
  "sin(hour)",
  "cos(hour)",
  "sin(2·hour)",
  "cos(2·hour)",
  "is weekend",
  "day of week",
  "recent occupancy",
];

function featurize(date: Date, recentRatio: number): number[] {
  const hourFrac = (date.getHours() + date.getMinutes() / 60) / 24;
  const dow = date.getDay();
  return [
    Math.sin(2 * Math.PI * hourFrac),
    Math.cos(2 * Math.PI * hourFrac),
    Math.sin(4 * Math.PI * hourFrac),
    Math.cos(4 * Math.PI * hourFrac),
    dow === 0 || dow === 6 ? 1 : 0,
    dow / 6,
    recentRatio,
  ];
}

/** Solve (XᵀX + λI)w = Xᵀy with Gaussian elimination (ridge regression). */
function solveRidge(X: number[][], y: number[], lambda = 1e-3): number[] {
  const n = X[0]!.length;
  const A: number[][] = Array.from({ length: n }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < X.length; k++) s += X[k]![i]! * X[k]![j]!;
      A[i]![j] = s + (i === j ? lambda : 0);
    }
    let s = 0;
    for (let k = 0; k < X.length; k++) s += X[k]![i]! * y[k]!;
    A[i]![n] = s;
  }
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r]![col]!) > Math.abs(A[pivot]![col]!)) pivot = r;
    [A[col], A[pivot]] = [A[pivot]!, A[col]!];
    const pv = A[col]![col]!;
    if (Math.abs(pv) < 1e-12) continue;
    for (let j = col; j <= n; j++) A[col]![j]! /= pv;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r]![col]!;
      if (!f) continue;
      for (let j = col; j <= n; j++) A[r]![j]! -= f * A[col]![j]!;
    }
  }
  return Array.from({ length: n }, (_, i) => A[i]![n]!);
}

/**
 * Trains a ridge-regression occupancy model on the supplied history.
 * This mirrors `backend/ml/predictor.py`, which uses a scikit-learn
 * RandomForestRegressor when the Python service is connected.
 */
export function trainModel(records: ParkingRecord[]): TrainedModel | null {
  if (records.length < 24) return null;
  const sorted = [...records].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 3; i < sorted.length; i++) {
    const r = sorted[i]!;
    const recent =
      mean([
        sorted[i - 1]!.occupancy_percentage,
        sorted[i - 2]!.occupancy_percentage,
        sorted[i - 3]!.occupancy_percentage,
      ]) / 100;
    X.push([1, ...featurize(new Date(r.recorded_at), recent)]);
    y.push(r.occupancy_percentage / 100);
  }
  const weights = solveRidge(X, y);
  const preds = X.map((row) => row.reduce((acc, v, i) => acc + v * weights[i]!, 0));
  const ybar = mean(y);
  const ssRes = y.reduce((acc, v, i) => acc + (v - preds[i]!) ** 2, 0);
  const ssTot = y.reduce((acc, v) => acc + (v - ybar) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const rmse = Math.sqrt(ssRes / y.length) * 100;

  // Feature importance = |weight| × feature std-dev, normalised to 100%.
  const raw = FEATURE_NAMES.map((name, idx) => {
    const col = X.map((row) => row[idx + 1]!);
    const m = mean(col);
    const sd = Math.sqrt(mean(col.map((v) => (v - m) ** 2)));
    return { name, value: Math.abs(weights[idx + 1]!) * sd };
  });
  const total = raw.reduce((a, b) => a + b.value, 0) || 1;
  const importance = raw
    .map((f) => ({ name: f.name, value: Math.round((f.value / total) * 1000) / 10 }))
    .sort((a, b) => b.value - a.value);

  return {
    weights,
    featureNames: FEATURE_NAMES,
    importance,
    r2: Math.round(r2 * 1000) / 10,
    rmse: Math.round(rmse * 10) / 10,
    samples: X.length,
    version: "demo-ridge-v1",
  };
}

export type PredictionInput = {
  date: Date;
  recentOccupancyPct: number;
  capacity: number;
  weatherPenalty?: number; // -1..1 adjustment, optional feature
  eventBoost?: number;
};

export type PredictionResult = {
  occupancyPct: number;
  occupied: number;
  available: number;
  level: AvailabilityLevel;
  confidence: number;
};

export function predictOccupancy(model: TrainedModel, input: PredictionInput): PredictionResult {
  const feats = [1, ...featurize(input.date, input.recentOccupancyPct / 100)];
  let ratio = feats.reduce((acc, v, i) => acc + v * model.weights[i]!, 0);
  ratio += (input.eventBoost ?? 0) * 0.12 - (input.weatherPenalty ?? 0) * 0.08;
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 1000) / 10));
  const occupied = Math.round((pct / 100) * input.capacity);
  return {
    occupancyPct: pct,
    occupied,
    available: Math.max(0, input.capacity - occupied),
    level: availabilityLevel(pct),
    // Confidence is derived from in-sample fit quality, not a calibrated probability.
    confidence: Math.max(35, Math.min(97, Math.round(model.r2 - model.rmse / 2))),
  };
}
