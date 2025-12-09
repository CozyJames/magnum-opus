// ============================================================================
// MAGNUM OPUS v3.0 — Registration Flow (Light Theme)
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
          setError(`Качество низкое (${profile.quality}%). Попробуйте снова, печатая равномернее.`);
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

  const steps = ['Имя', 'Калибровка', 'Секрет', 'Ответ'];
  const currentIdx = [RegStep.USERNAME, RegStep.MANTRA, RegStep.SECRET_SETUP, RegStep.ANSWER_CALIBRATION].indexOf(step);

  return (
    <div className="w-full max-w-xl mx-auto px-4 animate-fade-in">
      {/* Header */}
      {step !== RegStep.FINISH && (
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-light-500 hover:text-light-900 transition-colors mb-6"
          >
            <ArrowLeft size={20} />
            <span>Отмена</span>
          </button>

          <h2 className="text-2xl font-bold text-light-900 mb-6">Регистрация</h2>

          {/* Progress */}
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-2 rounded-full transition-colors ${
                  i === currentIdx ? 'bg-primary-500' : i < currentIdx ? 'bg-success' : 'bg-light-300'
                }`} />
                <span className={`text-xs mt-2 block ${
                  i === currentIdx ? 'text-primary-600 font-medium' : i < currentIdx ? 'text-success' : 'text-light-400'
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
        <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-lg flex items-center gap-3">
          <AlertTriangle size={20} className="text-danger flex-shrink-0" />
          <span className="text-danger text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-danger hover:text-danger/70 text-xl">&times;</button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
          <Loader2 className="animate-spin text-primary-500" size={48} />
        </div>
      )}

      {/* Step: Username */}
      {step === RegStep.USERNAME && (
        <form onSubmit={handleUsernameSubmit} className="animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-light-900 mb-1">Шаг 1: Имя пользователя</h3>
            <p className="text-light-500">Введите ваше имя или никнейм</p>
          </div>

          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-white border-2 border-light-300 focus:border-primary-500 rounded-lg p-4 text-center text-xl text-light-900 placeholder-light-400 transition-colors"
            placeholder="Имя пользователя"
            autoFocus
          />

          <button
            type="submit"
            disabled={!username.trim()}
            className="w-full mt-6 py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-light-300 disabled:text-light-500 text-white rounded-lg font-medium transition-all text-lg"
          >
            Продолжить
          </button>
        </form>
      )}

      {/* Step: Mantra */}
      {step === RegStep.MANTRA && (
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-light-900 mb-2">Шаг 2: Калибровка</h3>
            <p className="text-light-500 mb-4">
              Введите фразу {MANTRA_CALIBRATION_COUNT} раз для создания вашего профиля
            </p>

            <div className="flex justify-center gap-3 mb-2">
              {Array.from({ length: MANTRA_CALIBRATION_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-colors ${
                    i < mantraAttempts.length ? 'bg-success' : i === mantraAttempts.length ? 'bg-primary-500' : 'bg-light-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-light-500">
              Попытка {mantraAttempts.length + 1} из {MANTRA_CALIBRATION_COUNT}
            </span>
          </div>

          <KeystrokeInput
            key={`mantra-${mantraAttempts.length}`}
            targetText={MANTRA_TEXT}
            onComplete={handleMantraComplete}
            label="Контрольная фраза"
          />
        </div>
      )}

      {/* Step: Secret Setup */}
      {step === RegStep.SECRET_SETUP && (
        <form onSubmit={handleSecretSetup} className="animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-light-900 mb-1">Шаг 3: Секретный вопрос</h3>
            <p className="text-light-500">Для дополнительной верификации</p>

            {mantraProfile && (
              <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-success/10 text-success text-sm">
                <CheckCircle size={16} />
                Качество профиля: {mantraProfile.quality}%
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-light-700 mb-2 block">Секретный вопрос</label>
              <input
                type="text"
                value={secretQuestion}
                onChange={(e) => setSecretQuestion(e.target.value)}
                className="w-full bg-white border-2 border-light-300 focus:border-primary-500 rounded-lg p-4 text-light-900 placeholder-light-400 transition-colors"
                placeholder="Например: Любимый цвет?"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-light-700 mb-2 block">
                Ответ (минимум {MIN_ANSWER_LENGTH} символа)
              </label>
              <input
                type="text"
                value={secretAnswer}
                onChange={(e) => setSecretAnswer(e.target.value)}
                className="w-full bg-white border-2 border-light-300 focus:border-primary-500 rounded-lg p-4 text-light-900 placeholder-light-400 transition-colors"
                placeholder="Ваш ответ"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!secretQuestion.trim() || secretAnswer.trim().length < MIN_ANSWER_LENGTH}
            className="w-full mt-6 py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-light-300 disabled:text-light-500 text-white rounded-lg font-medium transition-all text-lg"
          >
            Продолжить
          </button>
        </form>
      )}

      {/* Step: Answer Calibration */}
      {step === RegStep.ANSWER_CALIBRATION && (
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-light-900 mb-2">Шаг 4: Калибровка ответа</h3>
            <p className="text-light-500 mb-4">
              Введите "{secretAnswer}" {ANSWER_CALIBRATION_COUNT} раз
            </p>

            <div className="flex justify-center gap-3 mb-2">
              {Array.from({ length: ANSWER_CALIBRATION_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-colors ${
                    i < answerAttempts.length ? 'bg-success' : i === answerAttempts.length ? 'bg-primary-500' : 'bg-light-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-light-500">
              Попытка {answerAttempts.length + 1} из {ANSWER_CALIBRATION_COUNT}
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
        <div className="text-center animate-slide-up py-8">
          <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>

          <h3 className="text-2xl font-bold text-light-900 mb-2">Регистрация завершена!</h3>
          <p className="text-light-500 mb-8 max-w-sm mx-auto">
            Ваш биометрический профиль успешно создан. Теперь вы можете войти в систему.
          </p>

          {mantraProfile && (
            <div className="inline-flex items-center gap-4 px-6 py-3 rounded-xl bg-light-200 text-sm text-light-600 mb-8">
              <span>Качество: <span className="font-semibold text-light-900">{mantraProfile.quality}%</span></span>
              <span className="text-light-400">|</span>
              <span>Сэмплов: <span className="font-semibold text-light-900">{mantraProfile.sampleCount}</span></span>
            </div>
          )}

          <button
            onClick={onSuccess}
            className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-lg"
          >
            На главную
          </button>
        </div>
      )}
    </div>
  );
};

export default RegistrationFlow;
