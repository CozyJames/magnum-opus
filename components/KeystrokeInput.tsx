// ============================================================================
// MAGNUM OPUS v3.0 — Keystroke Input Component
// Captures precise timing data for biometric analysis
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RawKeystroke, KeystrokeTimings } from '../types';
import { extractTimings } from '../services/biometrics';
import { RotateCcw } from 'lucide-react';

interface KeystrokeInputProps {
  targetText: string;
  onComplete: (timings: KeystrokeTimings, rawKeystrokes: RawKeystroke[]) => void;
  label?: string;
  isMasked?: boolean;
}

const KeystrokeInput: React.FC<KeystrokeInputProps> = ({
  targetText,
  onComplete,
  label,
  isMasked = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [errors, setErrors] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const keystrokesRef = useRef<RawKeystroke[]>([]);
  const pendingKeyDown = useRef<Map<string, { time: number; char: string; position: number }>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);
  const completedRef = useRef(false);
  const nextPositionRef = useRef(0); // Track position independently of React state

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    reset();
  }, [targetText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock', 'Escape'].includes(e.key)) {
      return;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Backspace') {
      return;
    }
    if (completedRef.current || nextPositionRef.current >= targetText.length) {
      e.preventDefault();
      return;
    }

    const now = performance.now();
    const position = nextPositionRef.current;
    const expectedChar = targetText[position];
    pendingKeyDown.current.set(e.code, { time: now, char: expectedChar, position });
    nextPositionRef.current = position + 1;
  }, [targetText]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = performance.now();
    const pending = pendingKeyDown.current.get(e.code);

    if (pending) {
      const keystroke: RawKeystroke = {
        char: pending.char,
        code: e.code,
        keyDownTime: pending.time,
        keyUpTime: now,
      };

      // Use the position that was captured at keyDown time
      if (pending.position < targetText.length) {
        keystrokesRef.current[pending.position] = keystroke;
      }

      pendingKeyDown.current.delete(e.code);
    }
  }, [targetText]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (completedRef.current) return;

    const newVal = e.target.value;
    const oldVal = inputText;

    if (newVal.length < oldVal.length) {
      keystrokesRef.current = keystrokesRef.current.slice(0, newVal.length);
      nextPositionRef.current = newVal.length; // Sync position with actual input length
      setErrors(prev => prev.filter(idx => idx < newVal.length));
      setInputText(newVal);
      return;
    }

    if (newVal.length - oldVal.length > 1) {
      return;
    }

    const charIndex = newVal.length - 1;
    const typedChar = newVal[charIndex];
    const expectedChar = targetText[charIndex];
    const isCorrect = typedChar.toLowerCase() === expectedChar.toLowerCase();

    if (!isCorrect) {
      setErrors(prev => [...prev, charIndex]);
    }

    setInputText(newVal);

    if (newVal.length === targetText.length) {
      const hasErrors = errors.length > 0 || !isCorrect;
      if (!hasErrors) {
        finishInput();
      }
    }
  };

  const finishInput = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsComplete(true);

    setTimeout(() => {
      const now = performance.now();
      for (const ks of keystrokesRef.current) {
        if (!ks.keyUpTime || ks.keyUpTime <= ks.keyDownTime) {
          ks.keyUpTime = now;
        }
      }
      const timings = extractTimings(keystrokesRef.current);
      onComplete(timings, [...keystrokesRef.current]);
    }, 150);
  };

  const reset = () => {
    setInputText('');
    setErrors([]);
    setIsComplete(false);
    keystrokesRef.current = [];
    pendingKeyDown.current.clear();
    completedRef.current = false;
    nextPositionRef.current = 0;
    inputRef.current?.focus();
  };

  const renderOverlay = () => {
    return targetText.split('').map((char, index) => {
      const typed = inputText[index];
      const isCurrent = index === inputText.length;
      const isError = errors.includes(index);

      let charClass = 'inline-block transition-colors duration-100 ';

      if (!typed) {
        charClass += 'text-zinc-600';
      } else if (isError || typed.toLowerCase() !== char.toLowerCase()) {
        charClass += 'text-danger';
      } else {
        charClass += 'text-white';
      }

      // Пробелы рендерим как неразрывные, чтобы они не схлопывались
      const rawChar = typed || char;
      const displayChar = isMasked && typed ? '•' : (rawChar === ' ' ? '\u00A0' : rawChar);

      return (
        <span key={index} className={charClass} style={{ minWidth: char === ' ' ? '0.5em' : undefined }}>
          {displayChar}
          {isCurrent && !typed && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-primary animate-pulse" />
          )}
        </span>
      );
    });
  };

  const progressPercent = Math.min(100, (inputText.length / targetText.length) * 100);

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <div className="mb-4">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            {label}
          </span>
        </div>
      )}

      {/* Input Container */}
      <div
        className={`
          relative bg-dark-800 border rounded-xl p-6 cursor-text transition-all
          ${errors.length > 0
            ? 'border-danger/50'
            : isComplete
              ? 'border-success/50'
              : 'border-dark-600 focus-within:border-accent-primary/50'
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
        <div className="text-xl md:text-2xl font-mono tracking-wide leading-relaxed text-center relative">
          {renderOverlay()}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-dark-700 rounded-full mt-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-200 rounded-full ${
            errors.length > 0
              ? 'bg-danger'
              : isComplete
                ? 'bg-success'
                : 'bg-accent-primary'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Status Bar */}
      <div className="flex justify-between items-center mt-3">
        <div className="text-xs font-mono">
          {errors.length > 0 ? (
            <span className="text-danger">Ошибка — нажмите Backspace</span>
          ) : isComplete ? (
            <span className="text-success">Готово</span>
          ) : (
            <span className="text-zinc-500">
              {inputText.length} / {targetText.length}
            </span>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); reset(); }}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <RotateCcw size={12} />
          <span>Сброс</span>
        </button>
      </div>
    </div>
  );
};

export default KeystrokeInput;
