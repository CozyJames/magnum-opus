// ============================================================================
// MAGNUM OPUS v2.0 — Registration Flow
// Guides user through biometric profile creation
// ============================================================================

import React, { useState } from 'react';
import {
  MANTRA_TEXT,
  MANTRA_CALIBRATION_COUNT,
  ANSWER_CALIBRATION_COUNT,
  MIN_ANSWER_LENGTH,
  MIN_PROFILE_QUALITY,
} from '../constants';
import {
  KeystrokeTimings,
  RawKeystroke,
  CalibrationAttempt,
  UserProfile,
  BiometricProfile,
} from '../types';
import KeystrokeInput from './KeystrokeInput';
import { buildProfile, generateId, getQualityLabel } from '../services/biometrics';
import { saveUser, isUsernameTaken } from '../services/storage';
import {
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Target,
} from 'lucide-react';

interface RegistrationFlowProps {
  onBack: () => void;
  onSuccess: () => void;
}

enum RegStep {
  USERNAME,
  MANTRA,
  SECRET_SETUP,
  ANSWER_CALIBRATION,
  FINISH,
}

const RegistrationFlow: React.FC<RegistrationFlowProps> = ({ onBack, onSuccess }) => {
  // Step state
  const [step, setStep] = useState<RegStep>(RegStep.USERNAME);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // User data
  const [username, setUsername] = useState('');
  
  // Calibration data
  const [mantraAttempts, setMantraAttempts] = useState<CalibrationAttempt[]>([]);
  const [mantraProfile, setMantraProfile] = useState<BiometricProfile | null>(null);
  
  const [secretQuestion, setSecretQuestion] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');
  const [answerAttempts, setAnswerAttempts] = useState<CalibrationAttempt[]>([]);
  
  // ============================================================================
  // Handlers
  // ============================================================================
  
  /**
   * Handle username submission
   */
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Введите имя пользователя');
      return;
    }
    
    if (trimmedUsername.length < 2) {
      setError('Имя должно быть не менее 2 символов');
      return;
    }
    
    setIsLoading(true);
    try {
      const taken = await isUsernameTaken(trimmedUsername);
      if (taken) {
        setError('Это имя уже занято');
        setIsLoading(false);
        return;
      }
      setStep(RegStep.MANTRA);
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Handle mantra calibration attempt
   */
  const handleMantraComplete = (timings: KeystrokeTimings, raw: RawKeystroke[]) => {
    const attempt: CalibrationAttempt = {
      timings,
      timestamp: Date.now(),
      isValid: true, // Already validated by KeystrokeInput
    };
    
    const newAttempts = [...mantraAttempts, attempt];
    setMantraAttempts(newAttempts);
    
    // Check if we have enough samples
    if (newAttempts.length >= MANTRA_CALIBRATION_COUNT) {
      // Build profile and check quality
      try {
        const profile = buildProfile(newAttempts, MANTRA_TEXT);
        
        if (profile.quality < MIN_PROFILE_QUALITY) {
          setError(`Качество профиля низкое (${profile.quality}%). Попробуйте печатать более стабильно.`);
          setMantraAttempts([]); // Reset and try again
          return;
        }
        
        setMantraProfile(profile);
        setStep(RegStep.SECRET_SETUP);
      } catch (err) {
        setError('Ошибка построения профиля. Попробуйте снова.');
        setMantraAttempts([]);
      }
    }
  };
  
  /**
   * Handle secret question/answer setup
   */
  const handleSecretSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!secretQuestion.trim()) {
      setError('Введите секретный вопрос');
      return;
    }
    
    if (secretAnswer.trim().length < MIN_ANSWER_LENGTH) {
      setError(`Ответ должен быть не менее ${MIN_ANSWER_LENGTH} символов`);
      return;
    }
    
    setStep(RegStep.ANSWER_CALIBRATION);
  };
  
  /**
   * Handle answer calibration attempt
   */
  const handleAnswerComplete = (timings: KeystrokeTimings, raw: RawKeystroke[]) => {
    const attempt: CalibrationAttempt = {
      timings,
      timestamp: Date.now(),
      isValid: true,
    };
    
    const newAttempts = [...answerAttempts, attempt];
    setAnswerAttempts(newAttempts);
    
    // Check if we have enough samples
    if (newAttempts.length >= ANSWER_CALIBRATION_COUNT) {
      finishRegistration(newAttempts);
    }
  };
  
  /**
   * Complete registration and save user
   */
  const finishRegistration = async (finalAnswerAttempts: CalibrationAttempt[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build answer profile
      const answerProfile = buildProfile(finalAnswerAttempts, secretAnswer.trim());
      
      if (!mantraProfile) {
        throw new Error('Mantra profile not found');
      }
      
      // Create user object
      const newUser: UserProfile = {
        id: generateId(),
        username: username.trim(),
        mantraProfile,
        secretQuestion: secretQuestion.trim(),
        secretAnswer: secretAnswer.trim(),
        answerProfile,
        createdAt: Date.now(),
      };
      
      // Save to storage
      const success = await saveUser(newUser);
      
      if (success) {
        setStep(RegStep.FINISH);
      } else {
        throw new Error('Failed to save user');
      }
    } catch (err) {
      setError('Ошибка при сохранении профиля');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // ============================================================================
  // Render
  // ============================================================================
  
  const stepTitles = ['Имя', 'Мантра', 'Секрет', 'Калибровка'];
  const currentStepIndex = [RegStep.USERNAME, RegStep.MANTRA, RegStep.SECRET_SETUP, RegStep.ANSWER_CALIBRATION].indexOf(step);
  
  return (
    <div className="w-full max-w-5xl mx-auto px-4 animate-fade-in relative z-10">
      
      {/* Header & Navigation */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-6 group px-4 py-2 rounded hover:bg-white/5"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-display uppercase tracking-widest text-xs">Отмена</span>
        </button>
        
        <div className="flex justify-between items-end mb-4 px-2">
          <h2 className="text-3xl font-display font-bold text-white uppercase tracking-wider text-shadow-purple">
            Регистрация
          </h2>
          <span className="text-cyber-purple font-mono text-[10px] tracking-widest">
            BIOMETRIC_ENROLLMENT
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="grid grid-cols-4 gap-2 mb-2 px-1 max-w-2xl">
          {[0, 1, 2, 3].map((idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            
            return (
              <div key={idx} className="flex flex-col gap-2">
                <div
                  className={`h-1 w-full rounded-full transition-all duration-500 ${
                    isActive
                      ? 'bg-cyber-purple shadow-[0_0_10px_#d946ef]'
                      : isCompleted
                        ? 'bg-cyber-cyan'
                        : 'bg-white/10'
                  }`}
                />
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider ${
                    isActive
                      ? 'text-cyber-purple'
                      : isCompleted
                        ? 'text-cyber-cyan'
                        : 'text-gray-700'
                  }`}
                >
                  {stepTitles[idx]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Main Content Card */}
      <div className="bg-cyber-dark/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl min-h-[450px] flex flex-col justify-center relative overflow-hidden">
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-purple/10 blur-[50px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyber-cyan/10 blur-[50px] rounded-full pointer-events-none" />
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={48} className="text-cyber-cyan animate-spin" />
              <span className="font-mono text-xs animate-pulse text-cyber-cyan">
                PROCESSING...
              </span>
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-3 z-40">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
            <span className="text-red-400 text-sm font-mono">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-white"
            >
              ×
            </button>
          </div>
        )}
        
        {/* Step: Username */}
        {step === RegStep.USERNAME && (
          <form onSubmit={handleUsernameSubmit} className="space-y-8 relative z-10 max-w-2xl mx-auto w-full">
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-display text-white uppercase tracking-widest">
                Идентификатор
              </h3>
              <p className="text-gray-400 font-mono text-xs">
                Введите позывной для создания биометрического профиля
              </p>
            </div>
            
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/20 focus:border-cyber-purple rounded-xl p-5 text-2xl text-center text-white outline-none transition-all placeholder-gray-700 font-display tracking-widest uppercase focus:shadow-[0_0_30px_rgba(217,70,239,0.15)]"
                placeholder="CODENAME"
                autoFocus
                disabled={isLoading}
              />
            </div>
            
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading || !username.trim()}
                className="bg-white hover:bg-cyber-cyan text-black px-10 py-3 rounded-lg font-bold font-display uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Принять <ChevronRight size={18} />
              </button>
            </div>
          </form>
        )}
        
        {/* Step: Mantra Calibration */}
        {step === RegStep.MANTRA && (
          <div className="space-y-8 relative z-10 w-full">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-display text-white uppercase tracking-widest">
                Калибровка: Ритм
              </h3>
              <p className="text-gray-400 font-mono text-xs">
                Введите фразу {MANTRA_CALIBRATION_COUNT} раз для записи биометрического слепка
              </p>
              
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {Array.from({ length: MANTRA_CALIBRATION_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all ${
                      i < mantraAttempts.length
                        ? 'bg-cyber-cyan shadow-[0_0_8px_#06b6d4]'
                        : i === mantraAttempts.length
                          ? 'bg-cyber-purple animate-pulse'
                          : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              
              <div className="inline-block px-4 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-cyber-cyan mt-2 tracking-widest">
                ИТЕРАЦИЯ {mantraAttempts.length + 1} / {MANTRA_CALIBRATION_COUNT}
              </div>
            </div>
            
            <KeystrokeInput
              key={`mantra-${mantraAttempts.length}`}
              targetText={MANTRA_TEXT}
              onComplete={handleMantraComplete}
              label="ВВОД ЭТАЛОНА"
            />
            
            {/* Tips */}
            <div className="text-center text-gray-500 text-xs font-mono mt-4">
              <Target size={12} className="inline mr-2" />
              Печатайте в своём обычном ритме
            </div>
          </div>
        )}
        
        {/* Step: Secret Setup */}
        {step === RegStep.SECRET_SETUP && (
          <form onSubmit={handleSecretSetup} className="space-y-8 relative z-10 max-w-lg mx-auto w-full">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-display text-white uppercase tracking-widest">
                Секретный Ключ
              </h3>
              <p className="text-gray-400 font-mono text-xs">
                Настройте двухфакторную защиту
              </p>
              
              {/* Quality indicator */}
              {mantraProfile && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-green-500/10 border border-green-500/30 mt-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-green-400 text-xs font-mono">
                    Качество профиля: {mantraProfile.quality}% ({getQualityLabel(mantraProfile.quality)})
                  </span>
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              <div className="group">
                <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block tracking-wider group-focus-within:text-cyber-cyan transition-colors">
                  Секретный вопрос
                </label>
                <input
                  type="text"
                  value={secretQuestion}
                  onChange={(e) => setSecretQuestion(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-cyber-cyan rounded-lg p-4 text-white outline-none font-mono focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all"
                  placeholder="Например: Любимый цвет?"
                />
              </div>
              
              <div className="group">
                <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block tracking-wider group-focus-within:text-cyber-yellow transition-colors">
                  Ответ (мин. {MIN_ANSWER_LENGTH} символа)
                </label>
                <input
                  type="text"
                  value={secretAnswer}
                  onChange={(e) => setSecretAnswer(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-cyber-yellow rounded-lg p-4 text-white outline-none font-mono focus:shadow-[0_0_20px_rgba(234,179,8,0.15)] transition-all"
                  placeholder="Ваш ответ..."
                />
                <p className="text-[10px] text-gray-600 mt-1">
                  Этот ответ тоже будет биометрически защищён
                </p>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={!secretAnswer.trim() || !secretQuestion.trim() || secretAnswer.trim().length < MIN_ANSWER_LENGTH}
              className="w-full bg-cyber-cyan/10 border border-cyber-cyan/50 text-cyber-cyan hover:bg-cyber-cyan hover:text-black px-8 py-3 rounded-lg font-bold font-display uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Продолжить
            </button>
          </form>
        )}
        
        {/* Step: Answer Calibration */}
        {step === RegStep.ANSWER_CALIBRATION && (
          <div className="space-y-8 relative z-10 w-full max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-display text-white uppercase tracking-widest">
                Калибровка: Ответ
              </h3>
              <p className="text-gray-400 font-mono text-xs">
                Введите ответ "{secretAnswer}" {ANSWER_CALIBRATION_COUNT} раз
              </p>
              
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {Array.from({ length: ANSWER_CALIBRATION_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all ${
                      i < answerAttempts.length
                        ? 'bg-cyber-yellow shadow-[0_0_8px_#eab308]'
                        : i === answerAttempts.length
                          ? 'bg-cyber-purple animate-pulse'
                          : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              
              <div className="inline-block px-4 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-cyber-yellow mt-2 tracking-widest">
                ИТЕРАЦИЯ {answerAttempts.length + 1} / {ANSWER_CALIBRATION_COUNT}
              </div>
            </div>
            
            <KeystrokeInput
              key={`answer-${answerAttempts.length}`}
              targetText={secretAnswer.trim()}
              onComplete={handleAnswerComplete}
              label={`ОТВЕТ: ${secretQuestion}`}
              isMasked={false}
            />
          </div>
        )}
        
        {/* Step: Finish */}
        {step === RegStep.FINISH && (
          <div className="text-center space-y-10 animate-fade-in relative z-10">
            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(34,197,94,0.2)] border border-green-500/30">
              <ShieldCheck size={48} className="text-green-500" />
            </div>
            
            <div>
              <h3 className="text-4xl font-display text-white mb-4 uppercase tracking-widest">
                Профиль Создан
              </h3>
              <p className="text-gray-400 font-mono text-xs max-w-sm mx-auto leading-relaxed">
                Биометрические данные зашифрованы и сохранены.
                <br />
                Теперь только ваш уникальный ритм печати откроет доступ.
              </p>
              
              {/* Profile stats */}
              {mantraProfile && (
                <div className="mt-6 inline-flex items-center gap-4 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs font-mono text-gray-500">
                    Качество: <span className="text-cyber-cyan">{mantraProfile.quality}%</span>
                  </span>
                  <span className="text-gray-700">|</span>
                  <span className="text-xs font-mono text-gray-500">
                    Сэмплов: <span className="text-cyber-cyan">{mantraProfile.sampleCount}</span>
                  </span>
                </div>
              )}
            </div>
            
            <button
              onClick={onSuccess}
              className="bg-white text-black font-bold py-3 px-10 rounded hover:bg-cyber-cyan transition-colors font-display uppercase tracking-widest shadow-lg"
            >
              Завершить
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default RegistrationFlow;
