export const MANTRA_TEXT = "съешь ещё этих мягких французских булок";

export const MANTRA_CALIBRATION_COUNT = 5;
export const ANSWER_CALIBRATION_COUNT = 5;

export const MIN_ANSWER_LENGTH = 4;

export const THRESHOLD_ACCEPT = 0.55;
export const THRESHOLD_CHALLENGE = 0.85;
export const THRESHOLD_REJECT = 1.1;

export const CHALLENGE_THRESHOLD = 0.9;

export const COMBINED_THRESHOLD = 0.75;

export const MIN_CONFIDENCE_ACCEPT = 55;
export const MIN_CONFIDENCE_CHALLENGE = 35;

export const FEATURE_WEIGHTS = {
  dwell: 0.30,
  flight: 0.50,
  dd: 0.20,
};

export const CHALLENGE_WEIGHTS = {
  mantra: 0.55,
  answer: 0.45,
};

export const OUTLIER_Z_THRESHOLD = 2.5;

export const MIN_MAD_THRESHOLD = 40;

export const TIMING_CLAMPS = {
  minDwell: 10,
  maxDwell: 1000,
  minFlight: -200,
  maxFlight: 2000,
};

export const QUALITY_THRESHOLDS = {
  excellent: 80,
  good: 60,
  acceptable: 40,
  poor: 20,
};

export const MIN_PROFILE_QUALITY = 30;

export const CONFIDENCE_DISPLAY = {
  excellent: 85,
  good: 70,
  marginal: 55,
  poor: 40,
};

export const ANIMATION = {
  resultDelay: 300,
  chartAnimation: 1000,
  transitionSpeed: 200,
};

export const MIN_HUMAN_CV = 0.05;

export const MAX_PERFECT_RATIO = 0.3;

export const MIN_DWELL_STDDEV = 8;

export const MIN_FLIGHT_STDDEV = 15;

export const DEBUG_MODE = false;

export const SHOW_RAW_DATA = false;
