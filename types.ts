// ============================================================================
// MAGNUM OPUS v2.0 — Keystroke Dynamics Biometric Authentication
// Type Definitions
// ============================================================================

/**
 * Raw keystroke event captured during typing
 * Contains precise timestamps for both keydown and keyup events
 */
export interface RawKeystroke {
  char: string;
  code: string;           // Physical key code (e.g., 'KeyA', 'Space')
  keyDownTime: number;    // performance.now() timestamp
  keyUpTime: number;      // performance.now() timestamp
}

/**
 * Processed keystroke timing data extracted from raw keystrokes
 * This is what we use for biometric analysis
 */
export interface KeystrokeTimings {
  // Per-character timings
  dwellTimes: number[];    // Time each key was held (keyUp - keyDown)
  
  // Between-character timings (length = chars - 1)
  flightTimes: number[];   // Time from release of key N to press of key N+1 (UD latency)
  ddLatencies: number[];   // Time from press of key N to press of key N+1 (DD latency)
  
  // Metadata
  totalTime: number;       // Total typing duration
  chars: string[];         // Characters typed (for verification)
}

/**
 * Statistical profile for a single feature array
 * Used by Scaled Manhattan Distance algorithm
 */
export interface FeatureStats {
  mean: number[];          // Mean value for each position
  mad: number[];           // Mean Absolute Deviation for each position
  min: number[];           // Minimum observed value
  max: number[];           // Maximum observed value
}

/**
 * Complete biometric profile for a user
 * Built from multiple calibration samples
 */
export interface BiometricProfile {
  // Timing statistics
  dwell: FeatureStats;     // Dwell time statistics
  flight: FeatureStats;    // Flight time statistics
  dd: FeatureStats;        // Down-Down latency statistics
  
  // Profile metadata
  sampleCount: number;     // Number of samples used to build profile
  quality: number;         // Profile quality score (0-100)
  createdAt: number;       // Timestamp
  
  // Reference data
  targetText: string;      // The text this profile is for
  textLength: number;      // Length of target text
}

/**
 * User profile stored in database
 */
export interface UserProfile {
  id: string;
  username: string;
  
  // Biometric profiles
  mantraProfile: BiometricProfile;    // Profile for the mantra phrase
  
  // Secret question/answer
  secretQuestion: string;
  secretAnswer: string;
  answerProfile: BiometricProfile;    // Profile for the secret answer
  
  // Metadata
  createdAt: number;
  lastLogin?: number;
}

/**
 * Result of biometric matching
 */
export interface MatchResult {
  // Overall score (lower = better match)
  distance: number;        // Scaled Manhattan distance
  confidence: number;      // Converted to 0-100% (higher = better)
  
  // Per-feature breakdown
  dwellScore: number;      // Dwell time contribution
  flightScore: number;     // Flight time contribution
  ddScore: number;         // DD latency contribution
  
  // Feature weights used
  weights: {
    dwell: number;
    flight: number;
    dd: number;
  };
}

/**
 * Authentication result returned to UI
 */
export interface AuthResult {
  status: 'GRANTED' | 'DENIED' | 'CHALLENGE';
  confidence: number;      // 0-100%
  
  // Detailed match results for visualization
  mantraMatch?: MatchResult;
  answerMatch?: MatchResult;
  
  // Combined score if both were used
  finalScore?: number;
  
  // For debugging/visualization
  mantraTimings?: KeystrokeTimings;
  answerTimings?: KeystrokeTimings;
  
  // Reference to user
  userProfile?: UserProfile;
}

/**
 * Application state enum
 */
export enum AppState {
  HOME,
  REGISTER,
  LOGIN,
}

/**
 * Calibration attempt - stores raw data during registration
 */
export interface CalibrationAttempt {
  timings: KeystrokeTimings;
  timestamp: number;
  isValid: boolean;        // Did user type correctly without errors?
}

/**
 * Legacy type for backward compatibility
 * @deprecated Use KeystrokeTimings instead
 */
export interface KeyTiming {
  char: string;
  dwellTime: number;
}
