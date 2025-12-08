// ============================================================================
// MAGNUM OPUS v2.0 — Biometric Engine
// Implements Scaled Manhattan Distance algorithm
// Based on Killourhy & Maxion research (CMU Benchmark)
// ============================================================================

import {
  RawKeystroke,
  KeystrokeTimings,
  FeatureStats,
  BiometricProfile,
  MatchResult,
  CalibrationAttempt,
} from '../types';

import {
  OUTLIER_Z_THRESHOLD,
  MIN_MAD_THRESHOLD,
  TIMING_CLAMPS,
  FEATURE_WEIGHTS,
  QUALITY_THRESHOLDS,
  DEBUG_MODE,
} from '../constants';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

/**
 * Clamp a value between min and max
 */
const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Calculate mean of an array
 */
const mean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

/**
 * Calculate standard deviation
 */
const stdDev = (values: number[], meanValue?: number): number => {
  if (values.length < 2) return 0;
  const m = meanValue ?? mean(values);
  const squaredDiffs = values.map(v => Math.pow(v - m, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
};

/**
 * Calculate Mean Absolute Deviation (MAD)
 * More robust to outliers than standard deviation
 */
const calculateMAD = (values: number[], meanValue?: number): number => {
  if (values.length === 0) return 0;
  const m = meanValue ?? mean(values);
  const absoluteDeviations = values.map(v => Math.abs(v - m));
  return mean(absoluteDeviations);
};

/**
 * Remove outliers using Z-score method
 * Returns filtered array without extreme values
 */
const removeOutliers = (values: number[], zThreshold: number = OUTLIER_Z_THRESHOLD): number[] => {
  if (values.length < 3) return values; // Need enough data points
  
  const m = mean(values);
  const s = stdDev(values, m);
  
  if (s === 0) return values; // No variance, can't compute z-scores
  
  return values.filter(v => Math.abs(v - m) / s < zThreshold);
};

/**
 * Robust mean with outlier removal
 */
const robustMean = (values: number[]): number => {
  const filtered = removeOutliers(values);
  return mean(filtered.length > 0 ? filtered : values);
};

/**
 * Transpose a 2D array
 * [[a,b,c], [d,e,f]] -> [[a,d], [b,e], [c,f]]
 */
const transpose = <T>(matrix: T[][]): T[][] => {
  if (matrix.length === 0) return [];
  const rows = matrix.length;
  const cols = matrix[0].length;
  
  const result: T[][] = [];
  for (let c = 0; c < cols; c++) {
    result[c] = [];
    for (let r = 0; r < rows; r++) {
      result[c][r] = matrix[r][c];
    }
  }
  return result;
};

// ============================================================================
// KEYSTROKE PROCESSING
// ============================================================================

/**
 * Extract timing features from raw keystroke data
 * This is the core feature extraction function
 */
export const extractTimings = (keystrokes: RawKeystroke[]): KeystrokeTimings => {
  const n = keystrokes.length;
  
  if (n === 0) {
    return {
      dwellTimes: [],
      flightTimes: [],
      ddLatencies: [],
      totalTime: 0,
      chars: [],
    };
  }
  
  const dwellTimes: number[] = [];
  const flightTimes: number[] = [];
  const ddLatencies: number[] = [];
  const chars: string[] = [];
  
  for (let i = 0; i < n; i++) {
    const ks = keystrokes[i];
    chars.push(ks.char);
    
    // Dwell time: how long the key was held
    let dwell = ks.keyUpTime - ks.keyDownTime;
    dwell = clamp(dwell, TIMING_CLAMPS.minDwell, TIMING_CLAMPS.maxDwell);
    dwellTimes.push(dwell);
    
    // Inter-key timings (for i > 0)
    if (i > 0) {
      const prev = keystrokes[i - 1];
      
      // Flight time (Up-Down): release of previous to press of current
      // Can be negative if keys overlap (fast typing)
      let flight = ks.keyDownTime - prev.keyUpTime;
      flight = clamp(flight, TIMING_CLAMPS.minFlight, TIMING_CLAMPS.maxFlight);
      flightTimes.push(flight);
      
      // DD Latency (Down-Down): press of previous to press of current
      let dd = ks.keyDownTime - prev.keyDownTime;
      dd = clamp(dd, TIMING_CLAMPS.minDwell, TIMING_CLAMPS.maxFlight + TIMING_CLAMPS.maxDwell);
      ddLatencies.push(dd);
    }
  }
  
  // Total typing time
  const totalTime = keystrokes[n - 1].keyUpTime - keystrokes[0].keyDownTime;
  
  return {
    dwellTimes,
    flightTimes,
    ddLatencies,
    totalTime,
    chars,
  };
};

// ============================================================================
// PROFILE BUILDING
// ============================================================================

/**
 * Calculate statistics for a single feature across multiple attempts
 */
const buildFeatureStats = (allValues: number[][]): FeatureStats => {
  const transposed = transpose(allValues);
  
  const means: number[] = [];
  const mads: number[] = [];
  const mins: number[] = [];
  const maxs: number[] = [];
  
  for (const positionValues of transposed) {
    // Remove outliers before computing stats
    const cleaned = removeOutliers(positionValues);
    const values = cleaned.length > 0 ? cleaned : positionValues;
    
    const m = mean(values);
    means.push(m);
    mads.push(calculateMAD(values, m));
    mins.push(Math.min(...values));
    maxs.push(Math.max(...values));
  }
  
  return { mean: means, mad: mads, min: mins, max: maxs };
};

/**
 * Calculate profile quality score (0-100)
 * Based on consistency of timing patterns across samples
 */
const calculateProfileQuality = (stats: FeatureStats): number => {
  // Quality is based on coefficient of variation (CV = MAD/Mean)
  // Lower CV = more consistent = higher quality
  
  let totalCV = 0;
  let validCount = 0;
  
  for (let i = 0; i < stats.mean.length; i++) {
    const m = stats.mean[i];
    const mad = stats.mad[i];
    
    if (m > 0) {
      const cv = mad / m;
      totalCV += cv;
      validCount++;
    }
  }
  
  if (validCount === 0) return 0;
  
  const avgCV = totalCV / validCount;
  
  // Convert CV to quality score
  // CV of 0 = 100% quality, CV of 1 = 0% quality
  // Using exponential decay for smoother curve
  const quality = Math.exp(-avgCV * 2) * 100;
  
  return Math.round(clamp(quality, 0, 100));
};

/**
 * Build a complete biometric profile from calibration attempts
 */
export const buildProfile = (
  attempts: CalibrationAttempt[],
  targetText: string
): BiometricProfile => {
  // Filter only valid attempts
  const validAttempts = attempts.filter(a => a.isValid);
  
  if (validAttempts.length === 0) {
    throw new Error('No valid calibration attempts');
  }
  
  // Extract all timing arrays
  const allDwells = validAttempts.map(a => a.timings.dwellTimes);
  const allFlights = validAttempts.map(a => a.timings.flightTimes);
  const allDDs = validAttempts.map(a => a.timings.ddLatencies);
  
  // Build stats for each feature type
  const dwellStats = buildFeatureStats(allDwells);
  const flightStats = buildFeatureStats(allFlights);
  const ddStats = buildFeatureStats(allDDs);
  
  // Calculate overall quality (weighted average)
  const dwellQuality = calculateProfileQuality(dwellStats);
  const flightQuality = calculateProfileQuality(flightStats);
  const ddQuality = calculateProfileQuality(ddStats);
  
  const overallQuality = Math.round(
    dwellQuality * FEATURE_WEIGHTS.dwell +
    flightQuality * FEATURE_WEIGHTS.flight +
    ddQuality * FEATURE_WEIGHTS.dd
  );
  
  if (DEBUG_MODE) {
    console.log('Profile Quality Breakdown:', {
      dwell: dwellQuality,
      flight: flightQuality,
      dd: ddQuality,
      overall: overallQuality,
    });
  }
  
  return {
    dwell: dwellStats,
    flight: flightStats,
    dd: ddStats,
    sampleCount: validAttempts.length,
    quality: overallQuality,
    createdAt: Date.now(),
    targetText,
    textLength: targetText.length,
  };
};

// ============================================================================
// MATCHING ALGORITHM — SCALED MANHATTAN DISTANCE
// ============================================================================

/**
 * Calculate Scaled Manhattan Distance between attempt and profile
 * 
 * Formula: score = (1/n) × Σ |attempt_i - mean_i| / MAD_i
 * 
 * This normalizes each feature by its expected variance (MAD),
 * making features with high natural variance contribute proportionally
 * less to the final score.
 */

const scaledManhattan = (
  attemptValues: number[],
  profileMean: number[],
  profileMAD: number[]
): number => {
  // Берём минимальную длину — работаем с тем что есть
  const len = Math.min(attemptValues.length, profileMean.length, profileMAD.length);
  
  if (len === 0) {
    return 10; // Нет данных
  }
  
  let sum = 0;
  const MIN_MAD = 40;
  
  for (let i = 0; i < len; i++) {
    const mad = Math.max(profileMAD[i] || MIN_MAD, MIN_MAD);
    const attempt = attemptValues[i] || 0;
    const mean = profileMean[i] || 0;
    
    const diff = Math.abs(attempt - mean);
    const penalty = Math.min(diff / mad, 3.0);
    
    sum += penalty;
  }
  
  return sum / len;
};

/**
 * Calculate match result between an attempt and a profile
 * Returns detailed scoring breakdown
 */
export const calculateMatch = (
  timings: KeystrokeTimings,
  profile: BiometricProfile
): MatchResult => {
  // Calculate per-feature scores
  const dwellScore = scaledManhattan(
    timings.dwellTimes,
    profile.dwell.mean,
    profile.dwell.mad
  );
  
  const flightScore = scaledManhattan(
    timings.flightTimes,
    profile.flight.mean,
    profile.flight.mad
  );
  
  const ddScore = scaledManhattan(
    timings.ddLatencies,
    profile.dd.mean,
    profile.dd.mad
  );
  
  // Weighted combination
  const weights = FEATURE_WEIGHTS;
  
  // Handle potential Infinity values
  const safeScores = {
    dwell: isFinite(dwellScore) ? dwellScore : 10,
    flight: isFinite(flightScore) ? flightScore : 10,
    dd: isFinite(ddScore) ? ddScore : 10,
  };
  
  const distance = 
    safeScores.dwell * weights.dwell +
    safeScores.flight * weights.flight +
    safeScores.dd * weights.dd;
  
  // Convert distance to confidence (0-100%)
  // distance 0 = 100%, distance 2 = 0%
  const confidence = Math.max(0, Math.min(100, (1 - distance / 2.5) * 100));
  
  if (DEBUG_MODE) {
    console.log('Match Scores:', {
      dwell: safeScores.dwell.toFixed(3),
      flight: safeScores.flight.toFixed(3),
      dd: safeScores.dd.toFixed(3),
      weighted: distance.toFixed(3),
      confidence: confidence.toFixed(1) + '%',
    });
  }
  
  return {
    distance,
    confidence: Math.round(confidence * 10) / 10, // Round to 1 decimal
    dwellScore: safeScores.dwell,
    flightScore: safeScores.flight,
    ddScore: safeScores.dd,
    weights,
  };
};

// ============================================================================
// HELPER FUNCTIONS FOR UI
// ============================================================================

/**
 * Convert distance score to user-friendly confidence percentage
 */
export const distanceToConfidence = (distance: number): number => {
  // Exponential decay for more intuitive scaling
  // distance 0 → 100%, distance 1 → ~60%, distance 2 → ~35%
  const confidence = Math.exp(-distance * 0.7) * 100;
  return Math.round(clamp(confidence, 0, 100));
};

/**
 * Get quality label from numeric score
 */
export const getQualityLabel = (quality: number): string => {
  if (quality >= QUALITY_THRESHOLDS.excellent) return 'Отличное';
  if (quality >= QUALITY_THRESHOLDS.good) return 'Хорошее';
  if (quality >= QUALITY_THRESHOLDS.acceptable) return 'Приемлемое';
  return 'Низкое';
};

/**
 * Calculate average profile for legacy compatibility
 * @deprecated Use buildProfile instead
 */
export const calculateAverageProfile = (attempts: { char: string; dwellTime: number }[][]): { char: string; dwellTime: number }[] => {
  if (attempts.length === 0) return [];
  
  const length = attempts[0].length;
  const averaged: { char: string; dwellTime: number }[] = [];
  
  for (let i = 0; i < length; i++) {
    const char = attempts[0][i].char;
    const values = attempts.map(a => a[i]?.dwellTime ?? 0);
    const cleanedValues = removeOutliers(values);
    
    averaged.push({
      char,
      dwellTime: mean(cleanedValues.length > 0 ? cleanedValues : values),
    });
  }
  
  return averaged;
};

/**
 * Legacy confidence calculation
 * @deprecated Use calculateMatch instead
 */
export const calculateConfidence = (
  profile: { char: string; dwellTime: number }[],
  attempt: { char: string; dwellTime: number }[]
): number => {
  if (profile.length !== attempt.length) return 0;
  
  // Convert to new format and use new algorithm
  const profileMean = profile.map(p => p.dwellTime);
  const profileMAD = profile.map(() => 50); // Default MAD estimate
  const attemptValues = attempt.map(a => a.dwellTime);
  
  const distance = scaledManhattan(attemptValues, profileMean, profileMAD);
  return distanceToConfidence(distance);
};
