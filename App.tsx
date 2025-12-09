// ============================================================================
// MAGNUM OPUS v3.0 — Main Application Component
// Система биометрической аутентификации | МИРЭА, Кафедра КБ-1
// ============================================================================

import React, { useState } from 'react';
import { AppState } from './types';
import RegistrationFlow from './components/RegistrationFlow';
import LoginFlow from './components/LoginFlow';
import { LogIn, UserPlus } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);

  return (
    <div className="min-h-screen bg-light-100 text-light-900 font-sans flex flex-col">
      {/* Main Content */}
      <div className="flex-grow flex flex-col">
        {appState === AppState.HOME ? (
          <div className="flex-grow flex flex-col items-center justify-center px-6 py-12 animate-fade-in">
            {/* University Logo */}
            <div className="mb-6">
              <img
                src="/i.png"
                alt="МИРЭА"
                className="w-24 h-24 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            {/* Title */}
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-light-900 mb-2">
                Magnum Opus
              </h1>
              <p className="text-lg text-light-600 mb-1">
                Система биометрической аутентификации
              </p>
              <p className="text-base text-light-500">
                по клавиатурному почерку
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mb-12">
              <button
                onClick={() => setAppState(AppState.LOGIN)}
                className="flex-1 flex items-center justify-center gap-3 bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg font-medium text-lg shadow-sm"
              >
                <LogIn size={22} />
                <span>Войти</span>
              </button>

              <button
                onClick={() => setAppState(AppState.REGISTER)}
                className="flex-1 flex items-center justify-center gap-3 bg-white hover:bg-light-200 text-light-700 px-8 py-4 rounded-lg font-medium text-lg border border-light-300 shadow-sm"
              >
                <UserPlus size={22} />
                <span>Регистрация</span>
              </button>
            </div>

            {/* University Info */}
            <div className="text-center text-light-500 text-sm space-y-1">
              <p className="font-medium text-light-700">МИРЭА — Российский технологический университет</p>
              <p>Кафедра КБ-1</p>
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
      <footer className="py-4 px-6 border-t border-light-300 bg-white">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-light-500">
          <div>
            Разработчики: Ланцков Д., Мусаев М., Соболев И.
          </div>
          <div className="text-light-400">
            МИРЭА, 2024
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
