// ============================================================================
// MAGNUM OPUS v3.0 — Registration Flow
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
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle,
  User,
  Key,
  Shield,
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
  const [step, setStep] = useState<RegStep>(RegStep.USERNAME);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [mantraAttempts, setMantraAttempts] = useState<CalibrationAttempt[]>([]);
  const [mantraProfile, setMantraProfile] = useState<BiometricProfile | null>(null);
  const [secretQuestion, setSecretQuestion] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');
  const [answerAttempts, setAnswerAttempts] = useState<CalibrationAttempt[]>([]);

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 2) {
      setError('Имя должно быть не менее 2 символов');
      return;
    }

    setIsLoading(true);
    try {
      if (await isUsernameTaken(trimmed)) {
        setError('Это имя уже занято');
        return;
      }
      setStep(RegStep.MANTRA);
    } catch {
      setError('Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMantraComplete = (timings: KeystrokeTimings) => {
    const attempt: CalibrationAttempt = {
      timings,
      timestamp: Date.now(),
      isValid: true,
    };

    const newAttempts = [...mantraAttempts, attempt];
    setMantraAttempts(newAttempts);

    if (newAttempts.length >= MANTRA_CALIBRATION_COUNT) {
      try {
        const profile = buildProfile(newAttempts, MANTRA_TEXT);
        if (profile.quality < MIN_PROFILE_QUALITY) {
          setError(`Качество низкое (${profile.quality}%). Попробуйте снова.`);
          setMantraAttempts([]);
          return;
        }
        setMantraProfile(profile);
        setStep(RegStep.SECRET_SETUP);
      } catch {
        setError('Ошибка построения профиля');
        setMantraAttempts([]);
      }
    }
  };

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

  const handleAnswerComplete = (timings: KeystrokeTimings) => {
    const attempt: CalibrationAttempt = {
      timings,
      timestamp: Date.now(),
      isValid: true,
    };

    const newAttempts = [...answerAttempts, attempt];
    setAnswerAttempts(newAttempts);

    if (newAttempts.length >= ANSWER_CALIBRATION_COUNT) {
      finishRegistration(newAttempts);
    }
  };

  const finishRegistration = async (finalAttempts: CalibrationAttempt[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const answerProfile = buildProfile(finalAttempts, secretAnswer.trim());

      if (!mantraProfile) throw new Error('Profile missing');

      const newUser: UserProfile = {
        id: generateId(),
        username: username.trim(),
        mantraProfile,
        secretQuestion: secretQuestion.trim(),
        secretAnswer: secretAnswer.trim(),
        answerProfile,
        createdAt: Date.now(),
      };

      if (await saveUser(newUser)) {
        setStep(RegStep.FINISH);
      } else {
        throw new Error('Save failed');
      }
    } catch {
      setError('Ошибка сохранения профиля');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = ['Имя', 'Мантра', 'Секрет', 'Калибровка'];
  const currentIdx = [RegStep.USERNAME, RegStep.MANTRA, RegStep.SECRET_SETUP, RegStep.ANSWER_CALIBRATION].indexOf(step);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 animate-fade-in">
      {/* Header */}
      {step !== RegStep.FINISH && (
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span>Отмена</span>
          </button>

          <h2 className="text-2xl font-semibold text-white mb-6">Регистрация</h2>

          {/* Progress */}
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1 rounded-full transition-colors ${
                  i === currentIdx ? 'bg-accent-primary' : i < currentIdx ? 'bg-success' : 'bg-dark-600'
                }`} />
                <span className={`text-xs mt-2 block ${
                  i === currentIdx ? 'text-accent-primary' : i < currentIdx ? 'text-success' : 'text-zinc-600'
                }`}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-xl flex items-center gap-3">
          <AlertTriangle size={18} className="text-danger flex-shrink-0" />
          <span className="text-danger text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-danger hover:text-white">×</button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="fixed inset-0 bg-dark-950/80 flex items-center justify-center z-50">
          <Loader2 className="animate-spin text-accent-primary" size={40} />
        </div>
      )}

      {/* Step: Username */}
      {step === RegStep.USERNAME && (
        <form onSubmit={handleUsernameSubmit} className="animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-dark-600 flex items-center justify-center mx-auto mb-4">
              <User className="w-7 h-7 text-accent-primary" />
            </div>
            <h3 className="text-xl font-medium text-white mb-1">Идентификатор</h3>
            <p className="text-zinc-500 text-sm">Введите имя пользователя</p>
          </div>

          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-dark-800 border border-dark-600 focus:border-accent-primary rounded-xl p-4 text-center text-xl text-white placeholder-zinc-600 transition-colors"
            placeholder="Username"
            autoFocus
          />

          <button
            type="submit"
            disabled={!username.trim()}
            className="w-full mt-6 py-4 bg-accent-primary hover:bg-accent-muted disabled:bg-dark-700 disabled:text-zinc-500 text-white rounded-xl font-medium transition-all"
          >
            Продолжить
          </button>
        </form>
      )}

      {/* Step: Mantra */}
      {step === RegStep.MANTRA && (
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-dark-600 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-accent-primary" />
            </div>
            <h3 className="text-xl font-medium text-white mb-1">Калибровка</h3>
            <p className="text-zinc-500 text-sm mb-4">
              Введите фразу {MANTRA_CALIBRATION_COUNT} раз
            </p>

            <div className="flex justify-center gap-2 mb-2">
              {Array.from({ length: MANTRA_CALIBRATION_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i < mantraAttempts.length ? 'bg-success' : i === mantraAttempts.length ? 'bg-accent-primary' : 'bg-dark-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              {mantraAttempts.length + 1} / {MANTRA_CALIBRATION_COUNT}
            </span>
          </div>

          <KeystrokeInput
            key={`mantra-${mantraAttempts.length}`}
            targetText={MANTRA_TEXT}
            onComplete={handleMantraComplete}
            label="Эталонная фраза"
          />
        </div>
      )}

      {/* Step: Secret Setup */}
      {step === RegStep.SECRET_SETUP && (
        <form onSubmit={handleSecretSetup} className="animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-dark-600 flex items-center justify-center mx-auto mb-4">
              <Key className="w-7 h-7 text-accent-primary" />
            </div>
            <h3 className="text-xl font-medium text-white mb-1">Секретный ключ</h3>
            <p className="text-zinc-500 text-sm">Настройте двухфакторную защиту</p>

            {mantraProfile && (
              <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs">
                <CheckCircle size={14} />
                Качество: {mantraProfile.quality}% ({getQualityLabel(mantraProfile.quality)})
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Секретный вопрос</label>
              <input
                type="text"
                value={secretQuestion}
                onChange={(e) => setSecretQuestion(e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 focus:border-accent-primary rounded-xl p-4 text-white placeholder-zinc-600 transition-colors"
                placeholder="Например: Любимый цвет?"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Ответ (мин. {MIN_ANSWER_LENGTH} симв.)</label>
              <input
                type="text"
                value={secretAnswer}
                onChange={(e) => setSecretAnswer(e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 focus:border-accent-primary rounded-xl p-4 text-white placeholder-zinc-600 transition-colors"
                placeholder="Ваш ответ"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!secretQuestion.trim() || secretAnswer.trim().length < MIN_ANSWER_LENGTH}
            className="w-full mt-6 py-4 bg-accent-primary hover:bg-accent-muted disabled:bg-dark-700 disabled:text-zinc-500 text-white rounded-xl font-medium transition-all"
          >
            Продолжить
          </button>
        </form>
      )}

      {/* Step: Answer Calibration */}
      {step === RegStep.ANSWER_CALIBRATION && (
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <h3 className="text-xl font-medium text-white mb-1">Калибровка ответа</h3>
            <p className="text-zinc-500 text-sm mb-4">
              Введите "{secretAnswer}" {ANSWER_CALIBRATION_COUNT} раз
            </p>

            <div className="flex justify-center gap-2 mb-2">
              {Array.from({ length: ANSWER_CALIBRATION_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i < answerAttempts.length ? 'bg-success' : i === answerAttempts.length ? 'bg-accent-primary' : 'bg-dark-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              {answerAttempts.length + 1} / {ANSWER_CALIBRATION_COUNT}
            </span>
          </div>

          <KeystrokeInput
            key={`answer-${answerAttempts.length}`}
            targetText={secretAnswer.trim()}
            onComplete={handleAnswerComplete}
            label={secretQuestion}
          />
        </div>
      )}

      {/* Step: Finish */}
      {step === RegStep.FINISH && (
        <div className="text-center animate-slide-up py-12">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>

          <h3 className="text-2xl font-semibold text-white mb-2">Профиль создан</h3>
          <p className="text-zinc-500 text-sm mb-8 max-w-sm mx-auto">
            Биометрические данные сохранены. Теперь только ваш ритм печати откроет доступ.
          </p>

          {mantraProfile && (
            <div className="inline-flex items-center gap-4 px-4 py-2 rounded-xl bg-dark-800 text-xs text-zinc-400 mb-8">
              <span>Качество: <span className="text-white">{mantraProfile.quality}%</span></span>
              <span className="text-dark-600">|</span>
              <span>Сэмплов: <span className="text-white">{mantraProfile.sampleCount}</span></span>
            </div>
          )}

          <button
            onClick={onSuccess}
            className="px-8 py-4 bg-accent-primary hover:bg-accent-muted text-white rounded-xl font-medium transition-all"
          >
            Завершить
          </button>
        </div>
      )}
    </div>
  );
};

export default RegistrationFlow;
