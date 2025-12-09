// ============================================================================
// MAGNUM OPUS v3.0 — Login Flow (Light Theme)
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  KeystrokeTimings,
  RawKeystroke,
  AuthResult,
  MatchResult,
} from '../types';
import {
  MANTRA_TEXT,
  THRESHOLD_ACCEPT,
  THRESHOLD_REJECT,
  CHALLENGE_THRESHOLD,
  CHALLENGE_WEIGHTS,
  MIN_CONFIDENCE_ACCEPT,
  MIN_CONFIDENCE_CHALLENGE,
} from '../constants';
import { getUsers, resetDatabase, deleteUser } from '../services/storage';
import { calculateMatch, distanceToConfidence } from '../services/biometrics';
import KeystrokeInput from './KeystrokeInput';
import ResultChart from './ResultChart';
import {
  User,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

interface LoginFlowProps {
  onBack: () => void;
}

enum LoginStage {
  SELECT_USER,
  INPUT_MANTRA,
  INPUT_CHALLENGE,
  RESULT,
}

const LoginFlow: React.FC<LoginFlowProps> = ({ onBack }) => {
  const [stage, setStage] = useState<LoginStage>(LoginStage.SELECT_USER);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [result, setResult] = useState<AuthResult | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mantraMatch, setMantraMatch] = useState<MatchResult | null>(null);
  const [mantraTimings, setMantraTimings] = useState<KeystrokeTimings | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user);
    setMantraMatch(null);
    setMantraTimings(null);
    setStage(LoginStage.INPUT_MANTRA);
  };

  const handleMantraComplete = (timings: KeystrokeTimings) => {
    if (!selectedUser) return;

    const match = calculateMatch(timings, selectedUser.mantraProfile);
    setMantraMatch(match);
    setMantraTimings(timings);

    const isAcceptable =
      match.distance < THRESHOLD_ACCEPT &&
      match.confidence >= MIN_CONFIDENCE_ACCEPT &&
      match.liveness.isHuman;

    const isRejectable =
      match.distance > THRESHOLD_REJECT ||
      match.confidence < MIN_CONFIDENCE_CHALLENGE ||
      (!match.liveness.isHuman && match.liveness.score < 0.3);

    if (isAcceptable) {
      setResult({
        status: 'GRANTED',
        confidence: match.confidence,
        mantraMatch: match,
        mantraTimings: timings,
        userProfile: selectedUser,
      });
      setStage(LoginStage.RESULT);
    } else if (isRejectable) {
      setResult({
        status: 'DENIED',
        confidence: match.confidence,
        mantraMatch: match,
        mantraTimings: timings,
        userProfile: selectedUser,
      });
      setStage(LoginStage.RESULT);
    } else {
      setStage(LoginStage.INPUT_CHALLENGE);
    }
  };

  const handleChallengeComplete = (timings: KeystrokeTimings) => {
    if (!selectedUser || !mantraMatch) return;

    const answerMatch = calculateMatch(timings, selectedUser.answerProfile);
    const combinedDistance =
      mantraMatch.distance * CHALLENGE_WEIGHTS.mantra +
      answerMatch.distance * CHALLENGE_WEIGHTS.answer;
    const combinedConfidence = distanceToConfidence(combinedDistance);

    const distanceOk = combinedDistance < CHALLENGE_THRESHOLD;
    const confidenceOk = combinedConfidence >= MIN_CONFIDENCE_CHALLENGE;
    const livenessOk = answerMatch.liveness.isHuman || answerMatch.liveness.score >= 0.4;
    const passed = distanceOk && confidenceOk && livenessOk;

    setResult({
      status: passed ? 'GRANTED' : 'DENIED',
      confidence: combinedConfidence,
      mantraMatch,
      answerMatch,
      mantraTimings: mantraTimings ?? undefined,
      answerTimings: timings,
      finalScore: combinedDistance,
      userProfile: selectedUser,
    });
    setStage(LoginStage.RESULT);
  };

  const clearDatabase = async () => {
    if (confirm('Удалить всех пользователей?')) {
      await resetDatabase();
      loadUsers();
    }
  };

  const handleDeleteUser = async (e: React.MouseEvent, userId: string, username: string) => {
    e.stopPropagation();
    if (confirm(`Удалить пользователя "${username}"?`)) {
      await deleteUser(userId);
      loadUsers();
    }
  };

  const resetFlow = () => {
    setResult(null);
    setMantraMatch(null);
    setMantraTimings(null);
    setSelectedUser(null);
    setStage(LoginStage.SELECT_USER);
  };

  if (isLoading && stage === LoginStage.SELECT_USER) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={40} />
      </div>
    );
  }

  if (users.length === 0 && stage === LoginStage.SELECT_USER) {
    return (
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-light-200 flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-light-400" />
          </div>
          <h3 className="text-xl font-semibold text-light-900 mb-2">Нет пользователей</h3>
          <p className="text-light-500 mb-6">
            Сначала зарегистрируйте пользователя
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 animate-fade-in">
      {/* Header */}
      {stage !== LoginStage.RESULT && (
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-light-500 hover:text-light-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Назад</span>
          </button>

          {stage === LoginStage.SELECT_USER && users.length > 0 && (
            <button
              onClick={clearDatabase}
              className="text-light-400 hover:text-danger transition-colors"
              title="Очистить базу"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      )}

      {/* User Selection */}
      {stage === LoginStage.SELECT_USER && (
        <div className="animate-slide-up">
          <h2 className="text-2xl font-bold text-light-900 mb-2">Вход в систему</h2>
          <p className="text-light-500 mb-6">Выберите ваш профиль</p>

          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-4 p-4 bg-white border border-light-300 rounded-lg shadow-sm hover:border-primary-300 hover:shadow transition-all group"
              >
                <button
                  onClick={() => handleUserSelect(u)}
                  className="flex items-center gap-4 flex-grow text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="flex-grow">
                    <div className="font-semibold text-light-900">{u.username}</div>
                    <div className="text-sm text-light-500">
                      Качество профиля: {u.mantraProfile?.quality ?? 'N/A'}%
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => handleDeleteUser(e, u.id, u.username)}
                  className="p-2 text-light-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Удалить пользователя"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mantra Input */}
      {stage === LoginStage.INPUT_MANTRA && selectedUser && (
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-light-900 mb-2">Верификация</h2>
            <p className="text-light-500">
              Пользователь: <span className="font-medium text-light-700">{selectedUser.username}</span>
            </p>
          </div>

          <KeystrokeInput
            targetText={MANTRA_TEXT}
            onComplete={handleMantraComplete}
            label="Введите контрольную фразу"
          />
        </div>
      )}

      {/* Challenge */}
      {stage === LoginStage.INPUT_CHALLENGE && selectedUser && mantraMatch && (
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-xl font-bold text-light-900 mb-2">Дополнительная проверка</h2>
            <p className="text-light-500 mb-4">
              Первичный результат: {mantraMatch.confidence.toFixed(0)}%
            </p>
            <p className="text-lg font-medium text-light-700">"{selectedUser.secretQuestion}"</p>
          </div>

          <KeystrokeInput
            targetText={selectedUser.secretAnswer}
            onComplete={handleChallengeComplete}
            label="Введите ответ"
          />
        </div>
      )}

      {/* Result */}
      {stage === LoginStage.RESULT && result && selectedUser && (
        <div className="animate-slide-up">
          <div className={`text-center p-8 rounded-xl border-2 mb-6 ${
            result.status === 'GRANTED'
              ? 'bg-success/5 border-success'
              : 'bg-danger/5 border-danger'
          }`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              result.status === 'GRANTED' ? 'bg-success/10' : 'bg-danger/10'
            }`}>
              {result.status === 'GRANTED' ? (
                <CheckCircle className="w-10 h-10 text-success" />
              ) : (
                <XCircle className="w-10 h-10 text-danger" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-light-900 mb-2">
              {result.status === 'GRANTED' ? 'Доступ разрешён' : 'Доступ запрещён'}
            </h2>

            <div className={`text-5xl font-bold font-mono ${
              result.status === 'GRANTED' ? 'text-success' : 'text-danger'
            }`}>
              {result.confidence.toFixed(0)}%
            </div>

            {result.mantraMatch && (
              <div className="mt-4 flex justify-center gap-6 text-sm text-light-500">
                <span>Dwell: {result.mantraMatch.dwellScore.toFixed(2)}</span>
                <span>Flight: {result.mantraMatch.flightScore.toFixed(2)}</span>
                <span>DD: {result.mantraMatch.ddScore.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Charts */}
          {result.mantraMatch && result.mantraTimings && (
            <ResultChart
              title="Анализ: Контрольная фраза"
              profile={selectedUser.mantraProfile}
              attempt={result.mantraTimings}
              matchResult={result.mantraMatch}
            />
          )}

          {result.answerMatch && result.answerTimings && (
            <div className="mt-4">
              <ResultChart
                title="Анализ: Секретный ответ"
                profile={selectedUser.answerProfile}
                attempt={result.answerTimings}
                matchResult={result.answerMatch}
              />
            </div>
          )}

          <div className="flex justify-center mt-8">
            <button
              onClick={resetFlow}
              className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
            >
              Завершить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginFlow;
