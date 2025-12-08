// ============================================================================
// MAGNUM OPUS v2.0 — Configuration Constants
// Based on CMU Keystroke Dynamics Benchmark research
// ============================================================================

/**
 * The mantra phrase used for primary authentication
 * Chosen for:
 * - Good length (36 chars) - enough data points
 * - Mix of common digraphs in Russian
 * - Memorable and typeable
 */
export const MANTRA_TEXT = "съешь ещё этих мягких французских булок";

// ============================================================================
// CALIBRATION SETTINGS
// ============================================================================

/**
 * Number of samples required to build a reliable profile
 * Research shows 5+ samples significantly reduce EER
 */
export const MANTRA_CALIBRATION_COUNT = 5;
export const ANSWER_CALIBRATION_COUNT = 5;

/**
 * Minimum text length for secret answer
 * Shorter texts have less biometric information
 */
export const MIN_ANSWER_LENGTH = 4;

// ============================================================================
// MATCHING THRESHOLDS (Scaled Manhattan Distance)
// ============================================================================

/**
 * Scaled Manhattan Distance interpretation (with new confidence formula):
 * - distance 0.0 → 100% confidence (perfect match)
 * - distance 0.4 → 60% confidence (very good)
 * - distance 0.65 → 50% confidence (good, threshold for accept)
 * - distance 1.0 → 35% confidence (marginal)
 * - distance 1.3 → 28% confidence (poor, threshold for reject)
 *
 * These thresholds are calibrated for:
 * - Small user base (≤10 users)
 * - 5-sample calibration
 * - Balance between security and usability
 */

// Primary authentication (mantra) - DISTANCE thresholds
export const THRESHOLD_ACCEPT = 0.55;     // Instant access (≈55% confidence)
export const THRESHOLD_CHALLENGE = 0.85;  // Requires secret question (≈42% confidence)
export const THRESHOLD_REJECT = 1.1;      // Instant reject (≈32% confidence)

// Challenge authentication (secret answer)
export const CHALLENGE_THRESHOLD = 0.9;   // Must pass this after challenge

// Combined score threshold (weighted average of mantra + answer)
export const COMBINED_THRESHOLD = 0.75;

// ============================================================================
// CONFIDENCE THRESHOLDS (alternative way to set thresholds)
// ============================================================================

/**
 * Minimum confidence percentages for decisions
 * These are checked IN ADDITION to distance thresholds
 */
export const MIN_CONFIDENCE_ACCEPT = 55;    // Need at least 55% to accept
export const MIN_CONFIDENCE_CHALLENGE = 35; // Below 35% = instant reject

// ============================================================================
// FEATURE WEIGHTS
// ============================================================================

/**
 * Weights for combining different timing features
 * Based on research: Flight time is more discriminative than dwell time
 * DD latency adds redundant info but helps with robustness
 */
export const FEATURE_WEIGHTS = {
  dwell: 0.30,    // Hold time - less discriminative but stable
  flight: 0.50,   // Release-to-press - most discriminative
  dd: 0.20,       // Press-to-press - adds robustness
};

/**
 * Weights for combining mantra and answer scores during challenge
 */
export const CHALLENGE_WEIGHTS = {
  mantra: 0.55,   // Primary phrase
  answer: 0.45,   // Secret answer
};

// ============================================================================
// OUTLIER DETECTION
// ============================================================================

/**
 * Z-score threshold for outlier removal during profile building
 * Values beyond this are considered typing mistakes/anomalies
 */
export const OUTLIER_Z_THRESHOLD = 2.5;

/**
 * Minimum MAD (Mean Absolute Deviation) to consider a feature valid
 * If MAD is too low, the feature has no variance and shouldn't be used
 */
export const MIN_MAD_THRESHOLD = 40; // milliseconds

/**
 * Clamp values for timing features
 */
export const TIMING_CLAMPS = {
  minDwell: 10,       // Minimum key hold time (ms)
  maxDwell: 1000,     // Maximum key hold time (ms)
  minFlight: -200,    // Negative = key overlap (fast typists)
  maxFlight: 2000,    // Maximum pause between keys (ms)
};

// ============================================================================
// QUALITY METRICS
// ============================================================================

/**
 * Profile quality thresholds
 * Based on intra-user variance consistency
 */
export const QUALITY_THRESHOLDS = {
  excellent: 80,    // Very consistent typing
  good: 60,         // Normal variance
  acceptable: 40,   // High variance but usable
  poor: 20,         // May cause false rejects
};

/**
 * Minimum profile quality required to complete registration
 */
export const MIN_PROFILE_QUALITY = 35;

// ============================================================================
// UI CONSTANTS
// ============================================================================

/**
 * Confidence display thresholds for visual feedback
 */
export const CONFIDENCE_DISPLAY = {
  excellent: 85,    // Green zone
  good: 70,         // Light green
  marginal: 55,     // Yellow zone
  poor: 40,         // Orange zone
  // Below 40 = Red zone
};

/**
 * Animation delays (ms)
 */
export const ANIMATION = {
  resultDelay: 300,      // Delay before showing result
  chartAnimation: 1000,  // Chart bar animation duration
  transitionSpeed: 200,  // General transition speed
};

// ============================================================================
// ANTI-BOT / LIVENESS DETECTION
// ============================================================================

/**
 * Minimum coefficient of variation (CV) expected from human typing
 * CV = stdDev / mean
 * Bots/replay attacks often have near-zero variance
 */
export const MIN_HUMAN_CV = 0.05; // 5% minimum variation expected

/**
 * Maximum percentage of "perfect" timings allowed
 * Perfect = exactly matching profile within 5ms
 */
export const MAX_PERFECT_RATIO = 0.3; // Max 30% can be suspiciously perfect

/**
 * Minimum standard deviation of dwell times (ms)
 * Human typing always has some variance
 */
export const MIN_DWELL_STDDEV = 8;

/**
 * Minimum standard deviation of flight times (ms)
 */
export const MIN_FLIGHT_STDDEV = 15;

// ============================================================================
// DEBUG MODE
// ============================================================================

/**
 * Enable detailed logging for development
 */
export const DEBUG_MODE = false;

/**
 * Show raw timing data in UI (for debugging)
 */
export const SHOW_RAW_DATA = false;
