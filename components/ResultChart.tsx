// ============================================================================
// MAGNUM OPUS v2.0 — Result Chart Component
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
  Legend,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from 'recharts';
import { BiometricProfile, KeystrokeTimings, MatchResult } from '../types';
import { ChevronDown, ChevronUp, Activity, Timer, UserCheck, Bot } from 'lucide-react';

interface ResultChartProps {
  title: string;
  profile: BiometricProfile;
  attempt: KeystrokeTimings;
  matchResult: MatchResult;
}

type ChartMode = 'dwell' | 'flight' | 'combined';

/**
 * Custom tooltip component
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const profileVal = payload.find((p: any) => p.dataKey === 'profile')?.value;
    const attemptVal = payload.find((p: any) => p.dataKey === 'attempt')?.value;
    const madVal = payload.find((p: any) => p.dataKey === 'mad')?.value;
    
    return (
      <div className="bg-cyber-dark border border-cyber-purple/50 p-4 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <p className="text-white font-bold mb-2 font-display text-lg border-b border-white/10 pb-1">
          Символ: <span className="text-cyber-purple">"{label}"</span>
        </p>
        <div className="space-y-1 font-mono text-xs">
          {profileVal !== undefined && (
            <p className="text-cyber-cyan flex justify-between gap-4">
              <span>ЭТАЛОН:</span>
              <span className="font-bold">{profileVal.toFixed(0)} ms</span>
            </p>
          )}
          {attemptVal !== undefined && (
            <p className="text-cyber-yellow flex justify-between gap-4">
              <span>ПОПЫТКА:</span>
              <span className="font-bold">{attemptVal.toFixed(0)} ms</span>
            </p>
          )}
          {profileVal !== undefined && attemptVal !== undefined && (
            <p className="text-gray-400 mt-2 pt-2 border-t border-white/10 flex justify-between gap-4">
              <span>ДЕЛЬТА:</span>
              <span className={`font-bold ${Math.abs(profileVal - attemptVal) > (madVal || 50) ? 'text-red-400' : 'text-green-400'}`}>
                {Math.abs(profileVal - attemptVal).toFixed(0)} ms
              </span>
            </p>
          )}
          {madVal !== undefined && (
            <p className="text-gray-500 flex justify-between gap-4">
              <span>MAD:</span>
              <span>±{madVal.toFixed(0)} ms</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const ResultChart: React.FC<ResultChartProps> = ({
  title,
  profile,
  attempt,
  matchResult,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [mode, setMode] = useState<ChartMode>('combined');
  
  // Prepare dwell time data
  const dwellData = attempt.chars.map((char, i) => ({
    name: char || `${i}`,
    profile: profile.dwell.mean[i] || 0,
    attempt: attempt.dwellTimes[i] || 0,
    mad: profile.dwell.mad[i] || 0,
    diff: Math.abs((profile.dwell.mean[i] || 0) - (attempt.dwellTimes[i] || 0)),
  }));
  
  // Prepare flight time data (между символами, поэтому length - 1)
  const flightData = attempt.chars.slice(0, -1).map((char, i) => ({
    name: `${char}→${attempt.chars[i + 1] || ''}`,
    profile: profile.flight.mean[i] || 0,
    attempt: attempt.flightTimes[i] || 0,
    mad: profile.flight.mad[i] || 0,
    diff: Math.abs((profile.flight.mean[i] || 0) - (attempt.flightTimes[i] || 0)),
  }));
  
  // Get score color based on value
  const getScoreColor = (score: number): string => {
    if (score < 0.8) return 'text-green-400';
    if (score < 1.2) return 'text-cyan-400';
    if (score < 1.5) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  return (
    <div className="w-full bg-cyber-dark/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm hover:border-white/10 transition-colors">
      
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="pl-2 border-l-2 border-cyber-purple">
            <h3 className="text-white/80 font-display text-sm uppercase tracking-widest">
              {title}
            </h3>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Score badges */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className={`${getScoreColor(matchResult.dwellScore)}`}>
              D: {matchResult.dwellScore.toFixed(2)}
            </span>
            <span className={`${getScoreColor(matchResult.flightScore)}`}>
              F: {matchResult.flightScore.toFixed(2)}
            </span>
          </div>
          
          {expanded ? (
            <ChevronUp size={18} className="text-gray-500" />
          ) : (
            <ChevronDown size={18} className="text-gray-500" />
          )}
        </div>
      </div>
      
      {/* Content */}
      {expanded && (
        <div className="p-4 pt-0">
          
          {/* Mode Selector */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('dwell')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                mode === 'dwell'
                  ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/50'
                  : 'bg-white/5 text-gray-500 border border-transparent hover:text-white'
              }`}
            >
              <Timer size={12} />
              Dwell Time
            </button>
            <button
              onClick={() => setMode('flight')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                mode === 'flight'
                  ? 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/50'
                  : 'bg-white/5 text-gray-500 border border-transparent hover:text-white'
              }`}
            >
              <Activity size={12} />
              Flight Time
            </button>
            <button
              onClick={() => setMode('combined')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                mode === 'combined'
                  ? 'bg-cyber-yellow/20 text-cyber-yellow border border-cyber-yellow/50'
                  : 'bg-white/5 text-gray-500 border border-transparent hover:text-white'
              }`}
            >
              Комбо
            </button>
          </div>
          
          {/* Dwell Chart */}
          {(mode === 'dwell' || mode === 'combined') && (
            <div className={mode === 'combined' ? 'mb-6' : ''}>
              {mode === 'combined' && (
                <h4 className="text-[10px] uppercase text-gray-500 tracking-widest mb-2 font-mono flex items-center gap-2">
                  <Timer size={10} /> Dwell Time (удержание клавиши)
                </h4>
              )}
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dwellData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#444"
                      tick={{ fill: '#666', fontSize: 9, fontFamily: 'monospace' }}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#444"
                      tick={{ fill: '#666', fontSize: 9, fontFamily: 'monospace' }}
                      width={35}
                      tickLine={false}
                      axisLine={false}
                      unit="ms"
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar
                      dataKey="profile"
                      name="Эталон"
                      fill="#06b6d4"
                      radius={[2, 2, 0, 0]}
                      barSize={10}
                      animationDuration={800}
                    />
                    <Bar
                      dataKey="attempt"
                      name="Попытка"
                      fill="#eab308"
                      radius={[2, 2, 0, 0]}
                      barSize={10}
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {/* Flight Chart */}
          {(mode === 'flight' || mode === 'combined') && (
            <div>
              {mode === 'combined' && (
                <h4 className="text-[10px] uppercase text-gray-500 tracking-widest mb-2 font-mono flex items-center gap-2">
                  <Activity size={10} /> Flight Time (между клавишами)
                </h4>
              )}
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={flightData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#444"
                      tick={{ fill: '#666', fontSize: 8, fontFamily: 'monospace' }}
                      interval={Math.floor(flightData.length / 15)}
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      stroke="#444"
                      tick={{ fill: '#666', fontSize: 9, fontFamily: 'monospace' }}
                      width={35}
                      tickLine={false}
                      axisLine={false}
                      unit="ms"
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    
                    {/* Profile as area */}
                    <Area
                      type="monotone"
                      dataKey="profile"
                      name="Эталон"
                      stroke="#d946ef"
                      fill="#d946ef"
                      fillOpacity={0.1}
                      strokeWidth={2}
                      animationDuration={800}
                    />
                    
                    {/* Attempt as line */}
                    <Line
                      type="monotone"
                      dataKey="attempt"
                      name="Попытка"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', r: 3 }}
                      activeDot={{ r: 5, fill: '#22c55e' }}
                      animationDuration={800}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4 text-[10px] font-mono text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-cyber-cyan" />
              <span>Эталон (профиль)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-cyber-yellow" />
              <span>Попытка</span>
            </div>
          </div>
          
          {/* Stats Summary */}
          <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Dwell Score</p>
              <p className={`font-mono text-lg font-bold ${getScoreColor(matchResult.dwellScore)}`}>
                {matchResult.dwellScore.toFixed(3)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Flight Score</p>
              <p className={`font-mono text-lg font-bold ${getScoreColor(matchResult.flightScore)}`}>
                {matchResult.flightScore.toFixed(3)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">DD Score</p>
              <p className={`font-mono text-lg font-bold ${getScoreColor(matchResult.ddScore)}`}>
                {matchResult.ddScore.toFixed(3)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Liveness</p>
              <div className={`font-mono text-lg font-bold flex items-center justify-center gap-1 ${
                matchResult.liveness.isHuman ? 'text-green-400' : 'text-red-400'
              }`}>
                {matchResult.liveness.isHuman ? (
                  <UserCheck size={16} />
                ) : (
                  <Bot size={16} />
                )}
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
