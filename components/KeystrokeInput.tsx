// ============================================================================
// MAGNUM OPUS v2.0 — Keystroke Input Component
// Captures precise timing data for biometric analysis
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RawKeystroke, KeystrokeTimings } from '../types';
import { extractTimings } from '../services/biometrics';
import { RefreshCw, Delete, Keyboard } from 'lucide-react';

interface KeystrokeInputProps {
  targetText: string;
  onComplete: (timings: KeystrokeTimings, rawKeystrokes: RawKeystroke[]) => void;
  label?: string;
  isMasked?: boolean;
  showRhythmIndicator?: boolean;
}

const KeystrokeInput: React.FC<KeystrokeInputProps> = ({
  targetText,
  onComplete,
  label,
  isMasked = false,
  showRhythmIndicator = true,
}) => {
  // State
  const [inputText, setInputText] = useState('');
  const [errors, setErrors] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [avgDwell, setAvgDwell] = useState<number | null>(null);
  
  // Refs for timing data (doesn't need re-renders)
  const keystrokesRef = useRef<RawKeystroke[]>([]);
  const pendingKeyDown = useRef<Map<string, { time: number; char: string }>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);
  const completedRef = useRef(false);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // Reset when targetText changes
  useEffect(() => {
    reset();
  }, [targetText]);
  
  /**
   * Handle key down event - record start time
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ignore modifier keys and navigation
    if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock', 'Escape'].includes(e.key)) {
      return;
    }
    
    // Ignore navigation keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      return;
    }
    
    // Handle backspace
    if (e.key === 'Backspace') {
      return; // Let onChange handle it
    }
    
    // Block input if already complete or at max length
    if (completedRef.current || inputText.length >= targetText.length) {
      e.preventDefault();
      return;
    }
    
    // Record key down time using high-precision timer
    const now = performance.now();
    const expectedChar = targetText[inputText.length];
    
    // Store pending keydown (waiting for keyup)
    pendingKeyDown.current.set(e.code, {
      time: now,
      char: expectedChar,
    });
    
  }, [inputText, targetText]);
  
  /**
   * Handle key up event - record end time and create keystroke record
   */
  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = performance.now();
    const pending = pendingKeyDown.current.get(e.code);
    
    if (pending) {
      // Create complete keystroke record
      const keystroke: RawKeystroke = {
        char: pending.char,
        code: e.code,
        keyDownTime: pending.time,
        keyUpTime: now,
      };
      
      // Add to keystrokes array at correct position
      const position = keystrokesRef.current.length;
      if (position < targetText.length) {
        keystrokesRef.current[position] = keystroke;
      }
      
      // Update rhythm indicator
      const dwell = now - pending.time;
      setAvgDwell(prev => {
        if (prev === null) return dwell;
        return prev * 0.7 + dwell * 0.3; // Exponential moving average
      });
      
      // Clean up pending
      pendingKeyDown.current.delete(e.code);
    }
  }, [targetText]);
  
  /**
   * Handle input change - validate characters
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (completedRef.current) return;
    
    const newVal = e.target.value;
    const oldVal = inputText;
    
    // Handle deletion
    if (newVal.length < oldVal.length) {
      const deleteCount = oldVal.length - newVal.length;
      
      // Remove keystrokes for deleted characters
      keystrokesRef.current = keystrokesRef.current.slice(0, newVal.length);
      
      // Update errors
      setErrors(prev => prev.filter(idx => idx < newVal.length));
      setInputText(newVal);
      return;
    }
    
    // Prevent paste (multi-character input)
    if (newVal.length - oldVal.length > 1) {
      return;
    }
    
    // New character typed
    const charIndex = newVal.length - 1;
    const typedChar = newVal[charIndex];
    const expectedChar = targetText[charIndex];
    
    // Check if correct (case-insensitive)
    const isCorrect = typedChar.toLowerCase() === expectedChar.toLowerCase();
    
    if (!isCorrect) {
      setErrors(prev => [...prev, charIndex]);
    }
    
    setInputText(newVal);
    
    // Check for completion
    if (newVal.length === targetText.length) {
      const hasErrors = errors.length > 0 || !isCorrect;
      
      if (!hasErrors) {
        finishInput();
      }
    }
  };
  
  /**
   * Complete input and send data to parent
   */
  const finishInput = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsComplete(true);
    
    // Small delay to capture final keyup
    setTimeout(() => {
      // Ensure all keystrokes have keyUpTime
      const now = performance.now();
      for (const ks of keystrokesRef.current) {
        if (!ks.keyUpTime || ks.keyUpTime <= ks.keyDownTime) {
          ks.keyUpTime = now;
        }
      }
      
      // Extract timings
      const timings = extractTimings(keystrokesRef.current);
      
      // Send to parent
      onComplete(timings, [...keystrokesRef.current]);
      
    }, 150);
  };
  
  /**
   * Reset input state
   */
  const reset = () => {
    setInputText('');
    setErrors([]);
    setIsComplete(false);
    setAvgDwell(null);
    keystrokesRef.current = [];
    pendingKeyDown.current.clear();
    completedRef.current = false;
    inputRef.current?.focus();
  };
  
  /**
   * Render the text overlay with color coding
   */
  const renderOverlay = () => {
    return targetText.split('').map((char, index) => {
      const typed = inputText[index];
      const isCurrent = index === inputText.length;
      const isError = errors.includes(index);
      
      let className = "inline-block w-[1ch] text-center transition-all duration-100 relative ";
      
      if (!typed) {
        // Untyped
        className += "text-gray-700 opacity-50";
      } else if (isError || typed.toLowerCase() !== char.toLowerCase()) {
        // Error
        className += "text-red-500 font-bold";
      } else {
        // Correct
        className += "text-cyber-cyan font-bold";
      }
      
      // Display character
      const displayChar = isMasked && typed ? '•' : (typed || char);
      
      return (
        <span key={index} className={className}>
          {displayChar}
          
          {/* Cursor */}
          {isCurrent && !typed && (
            <span className="absolute inset-0 bg-cyber-purple/60 animate-pulse block" />
          )}
          
          {/* Underline for untyped */}
          {!typed && !isCurrent && (
            <span className="absolute bottom-1 left-0 w-full h-[2px] bg-gray-800" />
          )}
        </span>
      );
    });
  };
  
  /**
   * Get rhythm indicator class based on typing speed
   */
  const getRhythmClass = (): string => {
    if (avgDwell === null) return 'bg-gray-700';
    if (avgDwell < 80) return 'bg-green-500 shadow-[0_0_10px_#22c55e]';   // Fast
    if (avgDwell < 150) return 'bg-cyber-cyan shadow-[0_0_10px_#06b6d4]'; // Normal
    if (avgDwell < 250) return 'bg-yellow-500 shadow-[0_0_10px_#eab308]'; // Slow
    return 'bg-red-500 shadow-[0_0_10px_#ef4444]';                        // Very slow
  };
  
  const progressPercent = Math.min(100, (inputText.length / targetText.length) * 100);
  
  return (
    <div className="w-full relative font-mono select-none">
      {/* Label */}
      {label && (
        <div className="text-center mb-4">
          <span className="text-xs font-display font-bold text-cyber-purple tracking-[0.2em] uppercase bg-cyber-purple/10 px-3 py-1 rounded border border-cyber-purple/20">
            {label}
          </span>
        </div>
      )}
      
      {/* Main Input Container */}
      <div
        className={`
          relative bg-black/40 border-2 transition-all duration-300 rounded-xl 
          p-8 min-h-[120px] flex items-center justify-center cursor-text 
          backdrop-blur-md overflow-hidden
          ${errors.length > 0 
            ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.15)]' 
            : isComplete 
              ? 'border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.15)]'
              : 'border-white/10 focus-within:border-cyber-cyan/50 focus-within:shadow-[0_0_30px_rgba(6,182,212,0.15)]'
          }
        `}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Hidden Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onPaste={(e) => e.preventDefault()}
          disabled={isComplete}
          className="absolute inset-0 opacity-0 cursor-text w-full h-full z-20"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
        />
        
        {/* Rendered Text */}
        <div className="z-10 text-2xl md:text-3xl tracking-wide leading-relaxed whitespace-nowrap w-full text-center font-mono overflow-x-auto">
          {renderOverlay()}
        </div>
        
        {/* Rhythm Indicator */}
        {showRhythmIndicator && avgDwell !== null && (
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <Keyboard size={14} className="text-gray-600" />
            <div className={`w-2 h-2 rounded-full transition-all ${getRhythmClass()}`} />
          </div>
        )}
      </div>
      
      {/* Progress Bar */}
      <div className="h-1 w-full bg-gray-800 mt-0 rounded-b-xl overflow-hidden relative top-[-2px]">
        <div
          className={`h-full transition-all duration-200 ease-out ${
            errors.length > 0 
              ? 'bg-red-500' 
              : isComplete 
                ? 'bg-green-500' 
                : 'bg-cyber-cyan'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      {/* Status Bar */}
      <div className="flex justify-between items-center px-1 mt-2">
        <div className="text-xs font-mono">
          {errors.length > 0 ? (
            <span className="text-red-500 flex items-center gap-2 animate-pulse font-bold tracking-wider">
              <Delete size={14} />
              ОШИБКА // BACKSPACE
            </span>
          ) : isComplete ? (
            <span className="text-green-500 flex items-center gap-2 tracking-wider">
              ✓ ГОТОВО
            </span>
          ) : (
            <span className="text-gray-500 tracking-wider">
              {inputText.length} / {targetText.length}
            </span>
          )}
        </div>
        
        <button
          onClick={(e) => { e.stopPropagation(); reset(); }}
          className="group flex items-center gap-2 text-[10px] text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
          title="Сброс"
        >
          <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
          RESET
        </button>
      </div>
      
      {/* Debug Info (hidden by default) */}
      {false && avgDwell && (
        <div className="mt-4 p-2 bg-black/50 rounded text-xs font-mono text-gray-500">
          Avg Dwell: {avgDwell.toFixed(0)}ms | 
          Keystrokes: {keystrokesRef.current.length}
        </div>
      )}
    </div>
  );
};

export default KeystrokeInput;
