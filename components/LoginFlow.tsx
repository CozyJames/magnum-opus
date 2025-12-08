// ============================================================================
// MAGNUM OPUS v2.0 — Login Flow
// Biometric authentication with challenge support
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
  THRESHOLD_CHALLENGE,
  THRESHOLD_REJECT,
  CHALLENGE_THRESHOLD,
  CHALLENGE_WEIGHTS,
} from '../constants';
import { getUsers, resetDatabase } from '../services/storage';
import { calculateMatch, distanceToConfidence } from '../services/biometrics';
import KeystrokeInput from './KeystrokeInput';
import ResultChart from './ResultChart';
import {
  User,
  Lock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ScanLine,
  Trash2,
  Loader2,
  WifiOff,
  Shield,
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
  // State
  const [stage, setStage] = useState<LoginStage>(LoginStage.SELECT_USER);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [result, setResult] = useState<AuthResult | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Intermediate data for challenge flow
  const [mantraMatch, setMantraMatch] = useState<MatchResult | null>(null);
  const [mantraTimings, setMantraTimings] = useState<KeystrokeTimings | null>(null);
  
  // ============================================================================
  // Data Loading
  // ============================================================================
  
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
  
  // ============================================================================
  // Handlers
  // ============================================================================
  
  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user);
    setMantraMatch(null);
    setMantraTimings(null);
    setStage(LoginStage.INPUT_MANTRA);
  };
  
  /**
   * Handle mantra input completion
   */
  const handleMantraComplete = (timings: KeystrokeTimings, raw: RawKeystroke[]) => {
    if (!selectedUser) return;
    
    // Calculate match score
    const match = calculateMatch(timings, selectedUser.mantraProfile);
    setMantraMatch(match);
    setMantraTimings(timings);
    
    console.log('Mantra Match:', {
      distance: match.distance.toFixed(3),
      confidence: match.confidence,
      thresholds: { accept: THRESHOLD_ACCEPT, challenge: THRESHOLD_CHALLENGE },
    });
    
    // Decision logic based on distance score
    if (match.distance < THRESHOLD_ACCEPT) {
      // High confidence - grant access immediately
      setResult({
        status: 'GRANTED',
        confidence: match.confidence,
        mantraMatch: match,
        mantraTimings: timings,
        userProfile: selectedUser,
      });
      setStage(LoginStage.RESULT);
      
    } else if (match.distance > THRESHOLD_REJECT) {
      // Very low confidence - reject immediately
      setResult({
        status: 'DENIED',
        confidence: match.confidence,
        mantraMatch: match,
        mantraTimings: timings,
        userProfile: selectedUser,
      });
      setStage(LoginStage.RESULT);
      
    } else {
      // Marginal confidence - require challenge
      setStage(LoginStage.INPUT_CHALLENGE);
    }
  };
  
  /**
   * Handle challenge (secret answer) completion
   */
  const handleChallengeComplete = (timings: KeystrokeTimings, raw: RawKeystroke[]) => {
    if (!selectedUser || !mantraMatch) return;
    
    // Calculate answer match
    const answerMatch = calculateMatch(timings, selectedUser.answerProfile);
    
    console.log('Answer Match:', {
      distance: answerMatch.distance.toFixed(3),
      confidence: answerMatch.confidence,
    });
    
    // Combined score (weighted average)
    const combinedDistance =
      mantraMatch.distance * CHALLENGE_WEIGHTS.mantra +
      answerMatch.distance * CHALLENGE_WEIGHTS.answer;
    
    const combinedConfidence = distanceToConfidence(combinedDistance);
    
    // Decision based on combined score
    const passed = combinedDistance < CHALLENGE_THRESHOLD;
    
    setResult({
      status: passed ? 'GRANTED' : 'DENIED',
      confidence: combinedConfidence,
      mantraMatch,
      answerMatch,
      mantraTimings,
      answerTimings: timings,
      finalScore: combinedDistance,
      userProfile: selectedUser,
    });
    setStage(LoginStage.RESULT);
  };
  
  /**
   * Clear all users from database
   */
  const clearDatabase = async () => {
    if (confirm('⚠️ ВНИМАНИЕ: Это удалит всех пользователей и их биометрические профили. Продолжить?')) {
      await resetDatabase();
      loadUsers();
    }
  };
  
  /**
   * Reset to user selection
   */
  const resetFlow = () => {
    setResult(null);
    setMantraMatch(null);
    setMantraTimings(null);
    setSelectedUser(null);
    setStage(LoginStage.SELECT_USER);
  };
  
  // ============================================================================
  // Render: Loading State
  // ============================================================================
  
  if (isLoading && stage === LoginStage.SELECT_USER) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-cyber-cyan mb-4" size={48} />
        <p className="font-mono text-xs animate-pulse text-gray-500">
          ESTABLISHING SECURE CONNECTION...
        </p>
      </div>
    );
  }
  
  // ============================================================================
  // Render: Empty State
  // ============================================================================
  
  if (users.length === 0 && stage === LoginStage.SELECT_USER) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
        <div className="p-10 border border-white/10 rounded-xl bg-cyber-dark/50 text-center shadow-lg max-w-md w-full backdrop-blur-md">
          <ScanLine size={48} className="mx-auto text-gray-600 mb-6" />
          <h3 className="text-xl text-white font-display uppercase tracking-widest mb-2">
            Нет Данных
          </h3>
          <p className="text-gray-400 mb-8 font-mono text-sm leading-relaxed">
            Реестр пуст.<br />
            Зарегистрируйте пользователя для начала.
          </p>
          <div className="space-y-4">
            <button
              onClick={onBack}
              className="w-full py-3 border border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan hover:text-black rounded font-bold font-display uppercase tracking-widest transition-colors"
            >
              В Главное Меню
            </button>
            <button
              onClick={loadUsers}
              className="flex items-center justify-center gap-2 w-full py-2 text-xs text-gray-600 hover:text-white transition-colors"
            >
              <WifiOff size={12} /> Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // ============================================================================
  // Main Render
  // ============================================================================
  
  return (
    <div className="w-full max-w-5xl mx-auto px-4 animate-fade-in relative z-10">
      
      {/* Navigation (hidden on result) */}
      {stage !== LoginStage.RESULT && (
        <div className="mb-8 flex justify-between items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group px-4 py-2 rounded hover:bg-white/5"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-display uppercase tracking-widest text-xs">Отмена</span>
          </button>
          
          {stage === LoginStage.SELECT_USER && (
            <button
              onClick={clearDatabase}
              className="text-gray-700 hover:text-red-500 transition-colors p-2"
              title="Сброс БД"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}
      
      {/* Stage: User Selection */}
      {stage === LoginStage.SELECT_USER && (
        <div className="space-y-8 animate-fade-in">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display text-white uppercase tracking-widest mb-2 text-shadow-purple">
              Выбор Субъекта
            </h2>
            <p className="text-gray-500 font-mono text-xs">
              {users.length} профил{users.length === 1 ? 'ь' : users.length < 5 ? 'я' : 'ей'} в системе
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => handleUserSelect(u)}
                className="group relative bg-cyber-dark/40 border border-white/5 hover:border-cyber-cyan p-0 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] text-left overflow-hidden backdrop-blur-sm"
              >
                {/* Card Header */}
                <div className="bg-white/5 p-3 border-b border-white/5 flex justify-between items-center">
                  <span className="font-mono text-[10px] text-gray-500 tracking-wider">
                    ID: {u.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-green-500 font-mono uppercase">Active</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-6 flex items-center gap-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-black rounded flex items-center justify-center border border-gray-700 group-hover:border-cyber-cyan transition-colors relative overflow-hidden">
                    <User className="text-gray-500 group-hover:text-cyber-cyan transition-colors relative z-10" size={24} />
                    <div className="absolute inset-0 bg-cyber-cyan/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  </div>
                  <div>
                    <h3 className="font-bold font-display text-lg text-white group-hover:text-cyber-cyan transition-colors tracking-wide">
                      {u.username}
                    </h3>
                    <p className="text-[10px] text-gray-600 font-mono">
                      Качество: {u.mantraProfile?.quality ?? 'N/A'}%
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Stage: Mantra Input */}
      {stage === LoginStage.INPUT_MANTRA && selectedUser && (
        <div className="max-w-4xl mx-auto bg-cyber-dark/60 backdrop-blur-xl border border-white/10 p-12 rounded-2xl shadow-2xl">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-cyber-purple/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyber-purple/30 shadow-[0_0_20px_rgba(217,70,239,0.2)]">
              <Lock className="text-cyber-purple" size={32} />
            </div>
            <h2 className="text-3xl font-display text-white uppercase tracking-widest mb-2">
              Верификация
            </h2>
            <div className="inline-block px-4 py-1 rounded bg-white/5 border border-white/10 text-xs font-mono text-gray-400">
              Субъект: <span className="text-white font-bold">{selectedUser.username}</span>
            </div>
          </div>
          
          <KeystrokeInput
            targetText={MANTRA_TEXT}
            onComplete={handleMantraComplete}
            label="ВВЕДИТЕ КОНТРОЛЬНУЮ ФРАЗУ"
          />
        </div>
      )}
      
      {/* Stage: Challenge (Secret Question) */}
      {stage === LoginStage.INPUT_CHALLENGE && selectedUser && mantraMatch && (
        <div className="max-w-4xl mx-auto bg-cyber-dark/60 backdrop-blur-xl border border-yellow-500/30 p-12 rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.15)] relative overflow-hidden animate-fade-in">
          
          {/* Warning strip */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-70" />
          
          <div className="text-center mb-12">
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center text-yellow-500">
              <AlertTriangle size={48} className="animate-pulse" />
            </div>
            <h2 className="text-3xl font-display text-white uppercase tracking-widest mb-2">
              Требуется Уточнение
            </h2>
            
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg inline-block max-w-lg">
              <p className="text-yellow-500 font-mono text-xs uppercase tracking-wider mb-2">
                Первичная проверка: {mantraMatch.confidence.toFixed(1)}%
              </p>
              <p className="text-gray-300 font-display text-xl">
                "{selectedUser.secretQuestion}"
              </p>
            </div>
          </div>
          
          <KeystrokeInput
            targetText={selectedUser.secretAnswer}
            onComplete={handleChallengeComplete}
            isMasked={false}
            label="ОТВЕТЬТЕ НА СЕКРЕТНЫЙ ВОПРОС"
          />
        </div>
      )}
      
      {/* Stage: Result */}
      {stage === LoginStage.RESULT && result && selectedUser && (
        <div className="max-w-4xl mx-auto animate-fade-in">
          
          {/* Result Header */}
          <div
            className={`text-center mb-8 p-12 rounded-3xl border relative overflow-hidden transition-all duration-1000 ${
              result.status === 'GRANTED'
                ? 'bg-green-950/30 border-green-500/30 shadow-[0_0_60px_rgba(34,197,94,0.15)]'
                : 'bg-red-950/30 border-red-500/30 shadow-[0_0_60px_rgba(239,68,68,0.15)]'
            }`}
          >
            <div className="relative z-10">
              {result.status === 'GRANTED' ? (
                <div className="mb-6 inline-flex p-4 rounded-full bg-green-500/10 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                  <CheckCircle className="text-green-500" size={48} />
                </div>
              ) : (
                <div className="mb-6 inline-flex p-4 rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                  <XCircle className="text-red-500" size={48} />
                </div>
              )}
              
              <h1 className="text-4xl md:text-5xl font-display text-white mb-6 uppercase tracking-[0.2em] font-bold">
                {result.status === 'GRANTED' ? 'Доступ Разрешен' : 'Доступ Запрещен'}
              </h1>
              
              <div className="inline-flex items-center gap-4 px-8 py-3 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
                <span className="text-gray-400 font-mono text-xs tracking-widest uppercase">
                  Biometric Match
                </span>
                <div className={`h-4 w-[1px] ${result.status === 'GRANTED' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`font-mono text-2xl font-bold ${result.status === 'GRANTED' ? 'text-cyber-cyan' : 'text-red-500'}`}>
                  {result.confidence.toFixed(1)}%
                </span>
              </div>
              
              {/* Score breakdown */}
              {result.mantraMatch && (
                <div className="mt-6 flex justify-center gap-6 text-xs font-mono">
                  <div className="text-gray-500">
                    Dwell: <span className="text-white">{result.mantraMatch.dwellScore.toFixed(2)}</span>
                  </div>
                  <div className="text-gray-500">
                    Flight: <span className="text-white">{result.mantraMatch.flightScore.toFixed(2)}</span>
                  </div>
                  <div className="text-gray-500">
                    DD: <span className="text-white">{result.mantraMatch.ddScore.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 gap-6">
            {result.mantraMatch && result.mantraTimings && (
              <ResultChart
                title="АНАЛИЗ: Контрольная Фраза"
                profile={selectedUser.mantraProfile}
                attempt={result.mantraTimings}
                matchResult={result.mantraMatch}
              />
            )}
            
            {result.answerMatch && result.answerTimings && (
              <ResultChart
                title="АНАЛИЗ: Секретный Ключ"
                profile={selectedUser.answerProfile}
                attempt={result.answerTimings}
                matchResult={result.answerMatch}
              />
            )}
          </div>
          
          {/* Actions */}
          <div className="flex justify-center mt-12 pb-12">
            <button
              onClick={resetFlow}
              className="group bg-white hover:bg-cyber-cyan text-black px-12 py-4 rounded-xl font-bold font-display uppercase tracking-widest transition-all shadow-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
            >
              <span className="group-hover:hidden">Завершить Сеанс</span>
              <span className="hidden group-hover:block">Главное Меню</span>
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default LoginFlow;
