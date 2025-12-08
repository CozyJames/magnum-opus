// ============================================================================
// MAGNUM OPUS v2.0 — Main Application Component
// Keystroke Dynamics Biometric Authentication System
// ============================================================================

import React, { useState } from 'react';
import { AppState } from './types';
import RegistrationFlow from './components/RegistrationFlow';
import LoginFlow from './components/LoginFlow';
import { Fingerprint, UserPlus, LogIn, Shield, Cpu } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);

  return (
    <div className="min-h-screen bg-cyber-black text-gray-200 relative overflow-x-hidden font-display selection:bg-cyber-purple selection:text-white flex flex-col">
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-cyber-grid bg-grid-pattern opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyber-purple/5 rounded-full blur-[100px] animate-pulse-slow pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-cyber-cyan/5 rounded-full blur-[80px] animate-pulse-slow pointer-events-none" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 flex-grow flex flex-col">
        
        {appState === AppState.HOME ? (
          <div className="flex-grow flex flex-col items-center justify-center animate-fade-in">
            
            {/* Central Logo Section */}
            <div className="text-center mb-16 relative group cursor-default">
              <div className="w-32 h-32 bg-gradient-to-tr from-cyber-purple/20 to-cyber-cyan/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-[0_0_50px_rgba(217,70,239,0.2)] group-hover:shadow-[0_0_80px_rgba(6,182,212,0.4)] transition-all duration-700 relative">
                <Fingerprint className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" size={64} />
                
                {/* Orbiting elements */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '20s' }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-cyber-cyan rounded-full shadow-[0_0_10px_#06b6d4]" />
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-cyber-purple rounded-full shadow-[0_0_10px_#d946ef]" />
                </div>
              </div>
              
              <h1 className="font-display font-bold text-5xl md:text-7xl text-white tracking-[0.1em] uppercase mb-4 text-shadow-purple">
                Magnum Opus
              </h1>
              
              <div className="flex items-center justify-center gap-4 text-sm font-mono text-gray-500 tracking-[0.3em] uppercase">
                <span>Biometric</span>
                <span className="w-1 h-1 bg-cyber-cyan rounded-full" />
                <span>Auth</span>
                <span className="w-1 h-1 bg-cyber-cyan rounded-full" />
                <span>v2.0</span>
              </div>
              
              {/* Algorithm badge */}
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400">
                <Cpu size={12} className="text-cyber-cyan" />
                Scaled Manhattan Distance Algorithm
              </div>
            </div>

            {/* Main Menu Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
              <button
                onClick={() => setAppState(AppState.LOGIN)}
                className="flex-1 group relative overflow-hidden bg-cyber-dark/40 border border-white/10 hover:border-cyber-cyan p-6 rounded-xl transition-all duration-300 hover:bg-cyber-cyan/5"
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className="bg-white/5 p-3 rounded-lg group-hover:bg-cyber-cyan/20 group-hover:text-cyber-cyan transition-colors">
                    <LogIn size={24} />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-xl uppercase tracking-wider text-white group-hover:text-cyber-cyan transition-colors">
                      Вход
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">АУТЕНТИФИКАЦИЯ</span>
                  </div>
                </div>
                
                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyber-cyan/0 via-cyber-cyan/5 to-cyber-cyan/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </button>

              <button
                onClick={() => setAppState(AppState.REGISTER)}
                className="flex-1 group relative overflow-hidden bg-cyber-dark/40 border border-white/10 hover:border-cyber-purple p-6 rounded-xl transition-all duration-300 hover:bg-cyber-purple/5"
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className="bg-white/5 p-3 rounded-lg group-hover:bg-cyber-purple/20 group-hover:text-cyber-purple transition-colors">
                    <UserPlus size={24} />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-xl uppercase tracking-wider text-white group-hover:text-cyber-purple transition-colors">
                      Новый Юзер
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">РЕГИСТРАЦИЯ</span>
                  </div>
                </div>
                
                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyber-purple/0 via-cyber-purple/5 to-cyber-purple/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </button>
            </div>

            {/* Features */}
            <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg text-center">
              <div className="space-y-2">
                <div className="w-10 h-10 mx-auto rounded-lg bg-cyber-cyan/10 flex items-center justify-center">
                  <Shield size={18} className="text-cyber-cyan" />
                </div>
                <p className="text-[10px] text-gray-500 font-mono uppercase">
                  Flight Time
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 mx-auto rounded-lg bg-cyber-purple/10 flex items-center justify-center">
                  <Fingerprint size={18} className="text-cyber-purple" />
                </div>
                <p className="text-[10px] text-gray-500 font-mono uppercase">
                  Dwell Time
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 mx-auto rounded-lg bg-cyber-yellow/10 flex items-center justify-center">
                  <Cpu size={18} className="text-cyber-yellow" />
                </div>
                <p className="text-[10px] text-gray-500 font-mono uppercase">
                  MAD Stats
                </p>
              </div>
            </div>

          </div>
        ) : (
          // Content Wrapper for Login/Register flows
          <div className="flex-grow flex flex-col justify-center py-12">
            {appState === AppState.REGISTER && (
              <RegistrationFlow
                onBack={() => setAppState(AppState.HOME)}
                onSuccess={() => setAppState(AppState.HOME)}
              />
            )}

            {appState === AppState.LOGIN && (
              <LoginFlow
                onBack={() => setAppState(AppState.HOME)}
              />
            )}
          </div>
        )}

        {/* Footer Status Bar */}
        <footer className="py-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_#22c55e]" />
              System Online
            </span>
            <span>v2.0.0-pro</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Scaled Manhattan Distance</span>
            <span className="text-cyber-cyan">•</span>
            <span>Magnum Opus Security © 2049</span>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default App;
