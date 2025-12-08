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
 * Scaled Manhattan Distance interpretation:
 * - 0.0 = Perfect match (impossible in practice)
 * - 0.5 = Excellent match
 * - 1.0 = Good match (likely genuine user)
 * - 1.5 = Marginal match (needs verification)
 * - 2.0+ = Poor match (likely impostor)
 * 
 * These thresholds are calibrated based on:
 * - CMU Benchmark results (EER ~9.6% for Scaled Manhattan)
 * - Small user base assumption (≤10 users)
 * - Balance between security and usability
 */

// Primary authentication (mantra)
export const THRESHOLD_ACCEPT = 1.0;      // Instant access granted
export const THRESHOLD_CHALLENGE = 1.6;   // Requires secret question
export const THRESHOLD_REJECT = 2.2;      // Instant reject

// Challenge authentication (secret answer)
export const CHALLENGE_THRESHOLD = 1.3;   // Must pass this after challenge

// Combined score threshold (weighted average of mantra + answer)
export const COMBINED_THRESHOLD = 1.2;

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
