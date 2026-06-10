// Camera distance/zoom defaults and limits.
// >1.0 zooms in (closer), <1.0 zooms out (farther / shows more of the world).
export const CAMERA_DISTANCE_MIN = 1.0;
export const CAMERA_DISTANCE_MAX = 2.0;
export const CAMERA_DISTANCE_STEP = 0.1;
const DEFAULT_CAMERA_DISTANCE_FACTOR = 1.5;

export const clampCameraDistanceFactor = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_CAMERA_DISTANCE_FACTOR;
  }
  const clamped = Math.max(CAMERA_DISTANCE_MIN, Math.min(CAMERA_DISTANCE_MAX, value));
  return Math.round(clamped / CAMERA_DISTANCE_STEP) * CAMERA_DISTANCE_STEP;
};

export const getDefaultCameraDistanceFactor = (): number => {
  if (typeof window === 'undefined') {
    return DEFAULT_CAMERA_DISTANCE_FACTOR;
  }

  const width = window.innerWidth || 0;
  const height = window.innerHeight || 0;

  if (width === 0 || height === 0) {
    return DEFAULT_CAMERA_DISTANCE_FACTOR;
  }

  const isPortrait = height > width;
  if (isPortrait) {
    return 1.2;
  }

  if (width < 900) {
    return 1.4;
  }

  return DEFAULT_CAMERA_DISTANCE_FACTOR;
};
