import React from 'react';
import { ShieldCheck, History, Users, Settings, Sparkles } from 'lucide-react';
import { ScreenType } from '../types';

interface NavbarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  hasSummary: boolean;
  contactsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  hasSummary,
  contactsCount
}) => {
  if (currentScreen === 'welcome' || currentScreen === 'onboarding') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-4 pb-4 pt-1 pointer-events-none">
      <nav className="pointer-events-auto bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl flex items-center justify-around">
        {/* Home Tab */}
        <button
          type="button"
          id="nav-home-btn"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center py-2 px-3 rounded-xl transition ${
            currentScreen === 'home'
              ? 'bg-violet-600 text-white font-bold shadow-lg shadow-violet-900/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </button>

        {/* History Tab */}
        <button
          type="button"
          id="nav-history-btn"
          onClick={() => onNavigate('history')}
          className={`flex flex-col items-center py-2 px-3 rounded-xl transition relative ${
            currentScreen === 'history' || currentScreen === 'ai_summary'
              ? 'bg-violet-600 text-white font-bold shadow-lg shadow-violet-900/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">History</span>
          {hasSummary && (
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        {/* Trusted Contacts Tab */}
        <button
          type="button"
          id="nav-contacts-btn"
          onClick={() => onNavigate('contacts')}
          className={`flex flex-col items-center py-2 px-3 rounded-xl transition relative ${
            currentScreen === 'contacts'
              ? 'bg-violet-600 text-white font-bold shadow-lg shadow-violet-900/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Contacts</span>
          {contactsCount > 0 && (
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-violet-400" />
          )}
        </button>

        {/* Settings Tab */}
        <button
          type="button"
          id="nav-settings-btn"
          onClick={() => onNavigate('settings')}
          className={`flex flex-col items-center py-2 px-3 rounded-xl transition ${
            currentScreen === 'settings'
              ? 'bg-violet-600 text-white font-bold shadow-lg shadow-violet-900/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Settings</span>
        </button>
      </nav>
    </div>
  );
};
