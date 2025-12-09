// ============================================================================
// MAGNUM OPUS v3.0 — Main Application Component
// Keystroke Dynamics Biometric Authentication System
// ============================================================================

import React, { useState } from 'react';
import { AppState } from './types';
import RegistrationFlow from './components/RegistrationFlow';
import LoginFlow from './components/LoginFlow';
import { Fingerprint, UserPlus, LogIn, Activity } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);

  return (
    <div className="min-h-screen text-zinc-100 font-sans flex flex-col">
      {/* Main Content */}
      <div className="flex-grow flex flex-col">
        {appState === AppState.HOME ? (
          <div className="flex-grow flex flex-col items-center justify-center px-4 animate-fade-in">
            {/* Logo & Title */}
            <div className="text-center mb-16">
              <div className="w-20 h-20 rounded-2xl bg-dark-800 border border-dark-600 flex items-center justify-center mx-auto mb-8">
                <Fingerprint className="w-10 h-10 text-accent-primary" />
              </div>

              <h1 className="text-4xl font-semibold text-white tracking-tight mb-3">
                Magnum Opus
              </h1>

              <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed">
                Биометрическая аутентификация на основе клавиатурной динамики
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <button
                onClick={() => setAppState(AppState.LOGIN)}
                className="flex-1 group flex items-center justify-center gap-3 bg-accent-primary hover:bg-accent-muted text-white px-6 py-4 rounded-xl font-medium transition-all"
              >
                <LogIn size={20} />
                <span>Войти</span>
              </button>

              <button
                onClick={() => setAppState(AppState.REGISTER)}
                className="flex-1 group flex items-center justify-center gap-3 bg-dark-700 hover:bg-dark-600 text-zinc-300 hover:text-white px-6 py-4 rounded-xl font-medium border border-dark-600 transition-all"
              >
                <UserPlus size={20} />
                <span>Регистрация</span>
              </button>
            </div>

            {/* Features */}
            <div className="mt-16 flex items-center gap-8 text-zinc-600 text-xs">
              <div className="flex items-center gap-2">
                <Activity size={14} />
                <span>Scaled Manhattan Distance</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-zinc-700" />
              <div>Liveness Detection</div>
              <div className="w-1 h-1 rounded-full bg-zinc-700" />
              <div>v3.0</div>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col py-8">
            {appState === AppState.REGISTER && (
              <RegistrationFlow
                onBack={() => setAppState(AppState.HOME)}
                onSuccess={() => setAppState(AppState.HOME)}
              />
            )}

            {appState === AppState.LOGIN && (
              <LoginFlow onBack={() => setAppState(AppState.HOME)} />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-4 px-6 flex justify-between items-center text-xs text-zinc-600 border-t border-dark-800">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
          <span>System Online</span>
        </div>
        <div>Magnum Opus Security</div>
      </footer>
    </div>
  );
};

export default App;
