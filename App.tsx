import React, { useState } from 'react';
import { AppState } from './types';
import RegistrationFlow from './components/RegistrationFlow';
import LoginFlow from './components/LoginFlow';
import { LogIn, UserPlus, Phone, Mail, User } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);

  return (
    <div className="min-h-screen bg-light-100 text-light-900 font-sans flex flex-col">
      <header className="py-3 px-6 border-b border-light-200 bg-white">
        <div className="max-w-5xl mx-auto flex justify-between items-start">
          <div className="text-sm text-light-600">
            <span className="font-medium text-light-800">РТУ МИРЭА</span>
            <span className="mx-2 text-light-300">|</span>
            <span>Кафедра КБ-1</span>
          </div>
          <div className="text-right text-sm">
            <div className="text-light-500 mb-1">Авторы проекта:</div>
            <div className="text-light-700 font-medium">
              Ланцков Дмитрий, Мусаев Максим, Соболев Иван
            </div>
            <div className="text-light-500 text-xs mt-0.5">
              Группа БАСО-04-23
            </div>
          </div>
        </div>
      </header>

      <div className="flex-grow flex flex-col">
        {appState === AppState.HOME ? (
          <div className="flex-grow flex flex-col items-center justify-center px-6 py-12 animate-fade-in">
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

            <div className="text-center text-light-500 text-sm">
              <p className="font-medium text-light-700">МИРЭА — Российский технологический университет</p>
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

      <footer className="py-4 px-6 border-t border-light-300 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="text-sm">
              <div className="text-light-500 mb-2 font-medium">Контакты:</div>
              <div className="flex flex-col sm:flex-row gap-3 text-light-600">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-light-400" />
                  <span>Максим Михайлович М.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-light-400" />
                  <span>8 964 335-38-38</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-light-400" />
                  <a href="mailto:maksimka_musaev93@mail.ru" className="hover:text-primary-600">
                    maksimka_musaev93@mail.ru
                  </a>
                </div>
              </div>
            </div>

            <div className="text-sm text-light-400">
              РТУ МИРЭА, 2025
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
