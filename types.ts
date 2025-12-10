export interface RawKeystroke {
  char: string;
  code: string;
  keyDownTime: number;
  keyUpTime: number;
}

export interface KeystrokeTimings {
  dwellTimes: number[];
  flightTimes: number[];
  ddLatencies: number[];
  totalTime: number;
  chars: string[];
}

export interface FeatureStats {
  mean: number[];
  mad: number[];
  min: number[];
  max: number[];
}

export interface BiometricProfile {
  dwell: FeatureStats;
  flight: FeatureStats;
  dd: FeatureStats;
  sampleCount: number;
  quality: number;
  createdAt: number;
  targetText: string;
  textLength: number;
}

export interface UserProfile {
  id: string;
  username: string;
  mantraProfile: BiometricProfile;
  secretQuestion: string;
  secretAnswer: string;
  answerProfile: BiometricProfile;
  createdAt: number;
  lastLogin?: number;
}

export interface MatchResult {
  distance: number;
  confidence: number;
  dwellScore: number;
  flightScore: number;
  ddScore: number;
  weights: {
    dwell: number;
    flight: number;
    dd: number;
  };
  liveness: {
    isHuman: boolean;
    score: number;
    flags: string[];
  };
}

export interface AuthResult {
  status: 'GRANTED' | 'DENIED' | 'CHALLENGE';
  confidence: number;
  mantraMatch?: MatchResult;
  answerMatch?: MatchResult;
  finalScore?: number;
  mantraTimings?: KeystrokeTimings;
  answerTimings?: KeystrokeTimings;
  userProfile?: UserProfile;
}

export enum AppState {
  HOME,
  REGISTER,
  LOGIN,
}

export interface CalibrationAttempt {
  timings: KeystrokeTimings;
  timestamp: number;
  isValid: boolean;
}

export interface KeyTiming {
  char: string;
  dwellTime: number;
}
