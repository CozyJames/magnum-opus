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
import { ChevronDown, ChevronUp } from 'lucide-react';

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
    <div className="bg-white border border-light-300 p-3 rounded-lg shadow-lg text-sm">
      <p className="font-medium text-light-900 mb-2">"{label}"</p>
      {profileVal !== undefined && (
        <p className="text-primary-600">Эталон: {profileVal.toFixed(0)} мс</p>
      )}
      {attemptVal !== undefined && (
        <p className="text-warning">Попытка: {attemptVal.toFixed(0)} мс</p>
      )}
      {profileVal !== undefined && attemptVal !== undefined && (
        <p className={`mt-1 pt-1 border-t border-light-200 ${
          Math.abs(profileVal - attemptVal) > 50 ? 'text-danger' : 'text-success'
        }`}>
          Разница: {Math.abs(profileVal - attemptVal).toFixed(0)} мс
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
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<ChartMode>('dwell');

  const targetChars = profile.targetText.split('');

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
    if (score < 1.2) return 'text-primary-600';
    if (score < 1.5) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="w-full bg-white border border-light-300 rounded-lg shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-light-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-medium text-light-900">{title}</h3>
        <div className="flex items-center gap-4">
          <div className="flex gap-4 text-sm font-mono">
            <span className={getScoreColor(matchResult.dwellScore)}>
              D: {matchResult.dwellScore.toFixed(2)}
            </span>
            <span className={getScoreColor(matchResult.flightScore)}>
              F: {matchResult.flightScore.toFixed(2)}
            </span>
          </div>
          {expanded ? <ChevronUp size={20} className="text-light-400" /> : <ChevronDown size={20} className="text-light-400" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 pt-0 border-t border-light-200">
          <div className="flex gap-2 mb-4">
            {[
              { key: 'dwell', label: 'Удержание (Dwell)' },
              { key: 'flight', label: 'Переход (Flight)' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMode(key as ChartMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === key
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-light-100 text-light-600 hover:bg-light-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'dwell' && (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dwellData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    width={40}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'мс', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="profile" name="Эталон" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={10} />
                  <Bar dataKey="attempt" name="Попытка" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {mode === 'flight' && (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={flightData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.max(0, Math.floor(flightData.length / 8))}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    width={40}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'мс', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="profile"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="attempt"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ fill: '#16a34a', r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex justify-center gap-8 mt-4 text-sm text-light-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary-500" />
              <span>Эталон</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-warning" />
              <span>Попытка</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultChart;
