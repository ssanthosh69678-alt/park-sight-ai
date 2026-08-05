/**
 * Typed contract for the self-hosted Flask REST API (see /backend).
 * Every payload here mirrors exactly what `backend/app.py` returns.
 */

export type FlaskResult<T> = { online: true; data: T } | { online: false; error: string };

export type FlaskStatus = {
  area_id: string | null;
  capacity: number;
  configured: number;
  occupied: number;
  available: number;
  unknown: number;
  occupancy_percentage: number;
  availability_level: "available" | "limited" | "full";
  camera_active: boolean;
  updated_at: string;
  simulated: boolean;
};

export type FlaskAnalytics = {
  area_id: string | null;
  samples: number;
  mean: number;
  median: number;
  mode: number;
  variance: number;
  std_dev: number;
  min: number;
  max: number;
  p95: number;
  hourly: { hour: number; occupancy: number }[];
  daily: { day: number; occupancy: number }[];
  peak_hour: number;
  quietest_hour: number;
  computed_at: string;
  engine: string;
  simulated: boolean;
};

export type FlaskPrediction = {
  prediction_time: string;
  predicted_occupancy: number;
  model_version: string;
  is_simulated: boolean;
};

export type FlaskForecast = {
  area_id: string | null;
  predictions: FlaskPrediction[];
  r2: number;
  samples: number;
  feature_importance: Record<string, number>;
  generated_at: string;
};

export type FlaskCameraSession = {
  session_id: string;
  area_id: string;
  source: string;
  status: "streaming" | "stopped";
  started_at: string;
  stopped_at?: string;
  duration_seconds?: number;
  frames_processed: number;
  model: string;
};

/** Records the Flask analytics/prediction endpoints expect. */
export type FlaskRecord = { recorded_at: string; occupancy_percentage: number };
