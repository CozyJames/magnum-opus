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
  MIN_HUMAN_CV,
  MIN_DWELL_STDDEV,
  MIN_FLIGHT_STDDEV,
} from '../constants';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const mean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

const stdDev = (values: number[], meanValue?: number): number => {
  if (values.length < 2) return 0;
  const m = meanValue ?? mean(values);
  const squaredDiffs = values.map(v => Math.pow(v - m, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
};

const calculateMAD = (values: number[], meanValue?: number): number => {
  if (values.length === 0) return 0;
  const m = meanValue ?? mean(values);
  const absoluteDeviations = values.map(v => Math.abs(v - m));
  return mean(absoluteDeviations);
};

const removeOutliers = (values: number[], zThreshold: number = OUTLIER_Z_THRESHOLD): number[] => {
  if (values.length < 3) return values;

  const m = mean(values);
  const s = stdDev(values, m);

  if (s === 0) return values;

  return values.filter(v => Math.abs(v - m) / s < zThreshold);
};

const robustMean = (values: number[]): number => {
  const filtered = removeOutliers(values);
  return mean(filtered.length > 0 ? filtered : values);
};

const transpose = <T>(matrix: T[][]): T[][] => {
  if (matrix.length === 0) return [];

  const cols = Math.max(...matrix.map(row => row.length));
  const rows = matrix.length;

  const result: T[][] = [];
  for (let c = 0; c < cols; c++) {
    result[c] = [];
    for (let r = 0; r < rows; r++) {
      if (matrix[r][c] !== undefined) {
        result[c].push(matrix[r][c]);
      }
    }
  }
  return result;
};

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

    let dwell = ks.keyUpTime - ks.keyDownTime;
    dwell = clamp(dwell, TIMING_CLAMPS.minDwell, TIMING_CLAMPS.maxDwell);
    dwellTimes.push(dwell);

    if (i > 0) {
      const prev = keystrokes[i - 1];

      let flight = ks.keyDownTime - prev.keyUpTime;
      flight = clamp(flight, TIMING_CLAMPS.minFlight, TIMING_CLAMPS.maxFlight);
      flightTimes.push(flight);

      let dd = ks.keyDownTime - prev.keyDownTime;
      dd = clamp(dd, TIMING_CLAMPS.minDwell, TIMING_CLAMPS.maxFlight + TIMING_CLAMPS.maxDwell);
      ddLatencies.push(dd);
    }
  }

  const totalTime = keystrokes[n - 1].keyUpTime - keystrokes[0].keyDownTime;

  return {
    dwellTimes,
    flightTimes,
    ddLatencies,
    totalTime,
    chars,
  };
};

const buildFeatureStats = (allValues: number[][]): FeatureStats => {
  const transposed = transpose(allValues);
  const sampleCount = allValues.length;

  const means: number[] = [];
  const mads: number[] = [];
  const mins: number[] = [];
  const maxs: number[] = [];

  const allFlattened = allValues.flat();
  const globalMean = mean(allFlattened);
  const globalMAD = calculateMAD(allFlattened, globalMean);

  for (const positionValues of transposed) {
    const cleaned = removeOutliers(positionValues);
    const values = cleaned.length > 0 ? cleaned : positionValues;

    const m = mean(values);
    let positionMAD = calculateMAD(values, m);

    if (sampleCount < 8 && globalMAD > 0) {
      const smoothingFactor = Math.max(0, (8 - sampleCount) / 8);
      positionMAD = positionMAD * (1 - smoothingFactor * 0.3) +
                    globalMAD * (smoothingFactor * 0.3);
    }

    positionMAD = Math.max(positionMAD, MIN_MAD_THRESHOLD);

    means.push(m);
    mads.push(positionMAD);
    mins.push(Math.min(...values));
    maxs.push(Math.max(...values));
  }

  return { mean: means, mad: mads, min: mins, max: maxs };
};

const calculateProfileQuality = (stats: FeatureStats): number => {
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

  const quality = 100 / Math.pow(1 + avgCV, 1.5);

  return Math.round(clamp(quality, 0, 100));
};

export const buildProfile = (
  attempts: CalibrationAttempt[],
  targetText: string
): BiometricProfile => {
  const validAttempts = attempts.filter(a => a.isValid);

  if (validAttempts.length === 0) {
    throw new Error('No valid calibration attempts');
  }

  const allDwells = validAttempts.map(a => a.timings.dwellTimes);
  const allFlights = validAttempts.map(a => a.timings.flightTimes);
  const allDDs = validAttempts.map(a => a.timings.ddLatencies);

  const dwellStats = buildFeatureStats(allDwells);
  const flightStats = buildFeatureStats(allFlights);
  const ddStats = buildFeatureStats(allDDs);

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

export const checkLiveness = (timings: KeystrokeTimings): {
  isHuman: boolean;
  score: number;
  flags: string[];
} => {
  const flags: string[] = [];
  let score = 1.0;

  if (timings.dwellTimes.length >= 3) {
    const dwellStd = stdDev(timings.dwellTimes);
    const dwellMean = mean(timings.dwellTimes);

    if (dwellStd < MIN_DWELL_STDDEV) {
      flags.push('LOW_DWELL_VARIANCE');
      score -= 0.4;
    }

    if (dwellMean > 0) {
      const cv = dwellStd / dwellMean;
      if (cv < MIN_HUMAN_CV) {
        flags.push('SUSPICIOUS_DWELL_CV');
        score -= 0.3;
      }
    }
  }

  if (timings.flightTimes.length >= 3) {
    const flightStd = stdDev(timings.flightTimes);
    const flightMean = mean(timings.flightTimes);

    if (flightStd < MIN_FLIGHT_STDDEV) {
      flags.push('LOW_FLIGHT_VARIANCE');
      score -= 0.4;
    }

    if (flightMean > 0) {
      const cv = flightStd / flightMean;
      if (cv < MIN_HUMAN_CV) {
        flags.push('SUSPICIOUS_FLIGHT_CV');
        score -= 0.3;
      }
    }
  }

  const checkRepeats = (arr: number[], tolerance: number = 5): boolean => {
    for (let i = 0; i < arr.length - 2; i++) {
      if (
        Math.abs(arr[i] - arr[i + 1]) < tolerance &&
        Math.abs(arr[i + 1] - arr[i + 2]) < tolerance
      ) {
        return true;
      }
    }
    return false;
  };

  if (checkRepeats(timings.dwellTimes)) {
    flags.push('REPEATING_DWELL_PATTERN');
    score -= 0.2;
  }

  if (checkRepeats(timings.flightTimes)) {
    flags.push('REPEATING_FLIGHT_PATTERN');
    score -= 0.2;
  }

  score = Math.max(0, Math.min(1, score));

  if (DEBUG_MODE && flags.length > 0) {
    console.log('Liveness Check:', { score, flags });
  }

  return {
    isHuman: score >= 0.5,
    score,
    flags,
  };
};

export const distanceToConfidence = (distance: number): number => {
  const confidence = 100 / Math.pow(1 + distance, 1.5);
  return Math.round(clamp(confidence, 0, 100));
};

const scaledManhattan = (
  attemptValues: number[],
  profileMean: number[],
  profileMAD: number[]
): number => {
  const len = Math.min(attemptValues.length, profileMean.length, profileMAD.length);

  if (len === 0) {
    return 10;
  }

  let sum = 0;

  for (let i = 0; i < len; i++) {
    const mad = Math.max(profileMAD[i] || MIN_MAD_THRESHOLD, MIN_MAD_THRESHOLD);
    const attempt = attemptValues[i] || 0;
    const profileMeanVal = profileMean[i] || 0;

    const diff = Math.abs(attempt - profileMeanVal);
    const penalty = Math.min(diff / mad, 3.0);

    sum += penalty;
  }

  return sum / len;
};

export const calculateMatch = (
  timings: KeystrokeTimings,
  profile: BiometricProfile
): MatchResult => {
  const liveness = checkLiveness(timings);

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

  const weights = FEATURE_WEIGHTS;

  const safeScores = {
    dwell: isFinite(dwellScore) ? dwellScore : 10,
    flight: isFinite(flightScore) ? flightScore : 10,
    dd: isFinite(ddScore) ? ddScore : 10,
  };

  let distance =
    safeScores.dwell * weights.dwell +
    safeScores.flight * weights.flight +
    safeScores.dd * weights.dd;

  if (!liveness.isHuman) {
    distance += (1 - liveness.score) * 1.5;
  }

  const confidence = distanceToConfidence(distance);

  if (DEBUG_MODE) {
    console.log('Match Scores:', {
      dwell: safeScores.dwell.toFixed(3),
      flight: safeScores.flight.toFixed(3),
      dd: safeScores.dd.toFixed(3),
      weighted: distance.toFixed(3),
      confidence: confidence.toFixed(1) + '%',
      liveness: liveness.score.toFixed(2),
      flags: liveness.flags,
    });
  }

  return {
    distance,
    confidence: Math.round(confidence * 10) / 10,
    dwellScore: safeScores.dwell,
    flightScore: safeScores.flight,
    ddScore: safeScores.dd,
    weights,
    liveness,
  };
};

export const getQualityLabel = (quality: number): string => {
  if (quality >= QUALITY_THRESHOLDS.excellent) return 'Отличное';
  if (quality >= QUALITY_THRESHOLDS.good) return 'Хорошее';
  if (quality >= QUALITY_THRESHOLDS.acceptable) return 'Приемлемое';
  return 'Низкое';
};

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

export const calculateConfidence = (
  profile: { char: string; dwellTime: number }[],
  attempt: { char: string; dwellTime: number }[]
): number => {
  if (profile.length !== attempt.length) return 0;

  const profileMean = profile.map(p => p.dwellTime);
  const profileMAD = profile.map(() => 50);
  const attemptValues = attempt.map(a => a.dwellTime);

  const distance = scaledManhattan(attemptValues, profileMean, profileMAD);
  return distanceToConfidence(distance);
};
