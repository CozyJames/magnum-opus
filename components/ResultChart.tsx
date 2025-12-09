// ============================================================================
// MAGNUM OPUS v3.0 — Result Chart Component
// Visualizes biometric comparison between profile and attempt
// ============================================================================

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
} from 'recharts';
import { BiometricProfile, KeystrokeTimings, MatchResult } from '../types';
import { ChevronDown, ChevronUp, Timer, Zap, UserCheck, Bot } from 'lucide-react';

interface ResultChartProps {
  title: string;
  profile: BiometricProfile;
  attempt: KeystrokeTimings;
  matchResult: MatchResult;
}

type ChartMode = 'dwell' | 'flight' | 'combined';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const profileVal = payload.find((p: any) => p.dataKey === 'profile')?.value;
  const attemptVal = payload.find((p: any) => p.dataKey === 'attempt')?.value;

  return (
    <div className="bg-dark-800 border border-dark-600 p-3 rounded-lg shadow-xl text-xs">
      <p className="text-white font-medium mb-2">"{label}"</p>
      {profileVal !== undefined && (
        <p className="text-info">Эталон: {profileVal.toFixed(0)} ms</p>
      )}
      {attemptVal !== undefined && (
        <p className="text-warning">Попытка: {attemptVal.toFixed(0)} ms</p>
      )}
      {profileVal !== undefined && attemptVal !== undefined && (
        <p className={`mt-1 pt-1 border-t border-dark-600 ${
          Math.abs(profileVal - attemptVal) > 50 ? 'text-danger' : 'text-success'
        }`}>
          Δ {Math.abs(profileVal - attemptVal).toFixed(0)} ms
        </p>
      )}
    </div>
  );
};

const ResultChart: React.FC<ResultChartProps> = ({
  title,
  profile,
  attempt,
  matchResult,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [mode, setMode] = useState<ChartMode>('combined');

  // Use profile.targetText as canonical source for character labels
  const targetChars = profile.targetText.split('');

  // Prepare dwell data - use all characters from profile
  const dwellLength = Math.min(
    profile.dwell.mean.length,
    attempt.dwellTimes.length,
    targetChars.length
  );
  const dwellData = Array.from({ length: dwellLength }, (_, i) => ({
    name: targetChars[i] === ' ' ? '␣' : targetChars[i],
    profile: profile.dwell.mean[i] ?? 0,
    attempt: attempt.dwellTimes[i] ?? 0,
  }));

  // Prepare flight data
  const flightLength = Math.min(
    profile.flight.mean.length,
    attempt.flightTimes.length,
    targetChars.length - 1
  );
  const flightData = Array.from({ length: flightLength }, (_, i) => {
    const char1 = targetChars[i] === ' ' ? '␣' : targetChars[i];
    const char2 = targetChars[i + 1] === ' ' ? '␣' : targetChars[i + 1];
    return {
      name: `${char1}→${char2}`,
      profile: profile.flight.mean[i] ?? 0,
      attempt: attempt.flightTimes[i] ?? 0,
    };
  });

  const getScoreColor = (score: number): string => {
    if (score < 0.8) return 'text-success';
    if (score < 1.2) return 'text-info';
    if (score < 1.5) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="w-full bg-dark-800 border border-dark-600 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-700 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-sm font-medium text-white">{title}</h3>
        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-xs font-mono">
            <span className={getScoreColor(matchResult.dwellScore)}>
              D:{matchResult.dwellScore.toFixed(2)}
            </span>
            <span className={getScoreColor(matchResult.flightScore)}>
              F:{matchResult.flightScore.toFixed(2)}
            </span>
          </div>
          {expanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 pt-0">
          {/* Mode Selector */}
          <div className="flex gap-2 mb-4">
            {[
              { key: 'dwell', label: 'Dwell', icon: Timer },
              { key: 'flight', label: 'Flight', icon: Zap },
              { key: 'combined', label: 'Оба', icon: null },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMode(key as ChartMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  mode === key
                    ? 'bg-accent-primary/20 text-accent-primary'
                    : 'bg-dark-700 text-zinc-500 hover:text-white'
                }`}
              >
                {Icon && <Icon size={12} />}
                {label}
              </button>
            ))}
          </div>

          {/* Dwell Chart */}
          {(mode === 'dwell' || mode === 'combined') && (
            <div className={mode === 'combined' ? 'mb-6' : ''}>
              {mode === 'combined' && (
                <h4 className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5">
                  <Timer size={12} /> Dwell Time
                </h4>
              )}
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dwellData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#25252d" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#3f3f46"
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#3f3f46"
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      width={35}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="profile" name="Эталон" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={8} />
                    <Bar dataKey="attempt" name="Попытка" fill="#f59e0b" radius={[2, 2, 0, 0]} barSize={8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Flight Chart */}
          {(mode === 'flight' || mode === 'combined') && (
            <div>
              {mode === 'combined' && (
                <h4 className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5">
                  <Zap size={12} /> Flight Time
                </h4>
              )}
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={flightData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#25252d" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#3f3f46"
                      tick={{ fill: '#71717a', fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                      interval={Math.max(0, Math.floor(flightData.length / 10))}
                    />
                    <YAxis
                      stroke="#3f3f46"
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      width={35}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="profile"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="attempt"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-info" />
              <span>Эталон</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-warning" />
              <span>Попытка</span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-dark-600 grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-zinc-600 mb-1">Dwell</p>
              <p className={`font-mono font-semibold ${getScoreColor(matchResult.dwellScore)}`}>
                {matchResult.dwellScore.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 mb-1">Flight</p>
              <p className={`font-mono font-semibold ${getScoreColor(matchResult.flightScore)}`}>
                {matchResult.flightScore.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 mb-1">DD</p>
              <p className={`font-mono font-semibold ${getScoreColor(matchResult.ddScore)}`}>
                {matchResult.ddScore.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 mb-1">Liveness</p>
              <div className={`font-mono font-semibold flex items-center justify-center gap-1 ${
                matchResult.liveness.isHuman ? 'text-success' : 'text-danger'
              }`}>
                {matchResult.liveness.isHuman ? <UserCheck size={14} /> : <Bot size={14} />}
                {(matchResult.liveness.score * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultChart;
