import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowLeft, 
  StickyNote, 
  Zap, 
  X, 
  CheckCircle2, 
  Hourglass, 
  ShieldAlert,
  Sparkles,
  Plus
} from 'lucide-react';
import { UserProfile, SafetyCheckInDoc } from '../types';
import { db, collection, addDoc, updateDoc, doc } from '../lib/firebase';

interface SafetyCheckInScreenProps {
  user: UserProfile;
  onBack: () => void;
  onTriggerEmergency: (checkInNote?: string) => void;
  activeCheckIn: {
    docId: string | null;
    startTime: string | null;
    selectedDurationLabel: string;
    totalSeconds: number;
    remainingSeconds: number;
    note: string;
    isActive: boolean;
    isPromptShowing: boolean;
  } | null;
  onStartCheckIn: (durationLabel: string, seconds: number, note: string) => Promise<void>;
  onCancelCheckIn: () => Promise<void>;
  onRespondSafe: () => Promise<void>;
  onExtendCheckIn: () => Promise<void>;
}

export const SafetyCheckInScreen: React.FC<SafetyCheckInScreenProps> = ({
  user,
  onBack,
  onTriggerEmergency,
  activeCheckIn,
  onStartCheckIn,
  onCancelCheckIn,
  onRespondSafe,
  onExtendCheckIn
}) => {
  // Setup view states
  const [selectedPreset, setSelectedPreset] = useState<'15m' | '30m' | '1h' | '2h' | 'custom'>('30m');
  const [customMinutes, setCustomMinutes] = useState<string>('45');
  const [optionalNote, setOptionalNote] = useState<string>('');
  const [isStarting, setIsStarting] = useState<boolean>(false);

  // Prompt 60-second countdown
  const [promptCountdown, setPromptCountdown] = useState<number>(60);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (activeCheckIn?.isActive && activeCheckIn?.isPromptShowing) {
      if (promptCountdown > 0) {
        timer = setTimeout(() => {
          setPromptCountdown(prev => prev - 1);
        }, 1000);
      } else {
        // 60 seconds passed with no response -> Auto trigger emergency!
        onTriggerEmergency(activeCheckIn.note);
      }
    } else {
      setPromptCountdown(60);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeCheckIn?.isActive, activeCheckIn?.isPromptShowing, promptCountdown]);

  const getDurationDetails = (): { label: string; seconds: number } => {
    switch (selectedPreset) {
      case '15m':
        return { label: '15 minutes', seconds: 15 * 60 };
      case '30m':
        return { label: '30 minutes', seconds: 30 * 60 };
      case '1h':
        return { label: '1 hour', seconds: 60 * 60 };
      case '2h':
        return { label: '2 hours', seconds: 120 * 60 };
      case 'custom':
        const mins = Math.max(1, Math.min(1440, parseInt(customMinutes, 10) || 15));
        return { label: `${mins} minutes`, seconds: mins * 60 };
      default:
        return { label: '30 minutes', seconds: 30 * 60 };
    }
  };

  const handleStartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStarting) return;
    setIsStarting(true);
    try {
      const { label, seconds } = getDurationDetails();
      await onStartCheckIn(label, seconds, optionalNote);
    } catch (err) {
      console.error('Failed to start check-in:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const formatTimeRemaining = (totalSecs: number) => {
    if (totalSecs <= 0) return '00:00';
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-full bg-slate-900 text-white flex flex-col justify-between p-5 relative pb-24">
      {/* Header */}
      <div className="flex justify-between items-center z-10 mb-6">
        <button
          type="button"
          id="safety-checkin-back-btn"
          onClick={onBack}
          className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition flex items-center gap-2 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold">
          <Clock className="w-4 h-4 text-violet-400" />
          <span>SAFETY CHECK-IN</span>
        </div>
      </div>

      {/* Main Container Content */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {!activeCheckIn?.isActive ? (
          /* Check-In Setup Form */
          <form onSubmit={handleStartSubmit} className="space-y-5 animate-in fade-in duration-200">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
                <Clock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">
                Safety Check-In Setup
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Set a timer for your activity. If you don't check in before it expires, VERA will alert your trusted guardians.
              </p>
            </div>

            {/* Timer Selection Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Select Timer Duration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  id="timer-preset-15m"
                  onClick={() => setSelectedPreset('15m')}
                  className={`py-3 px-3 rounded-2xl border text-xs font-bold transition text-center ${
                    selectedPreset === '15m'
                      ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-950/60'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  15 Minutes
                </button>

                <button
                  type="button"
                  id="timer-preset-30m"
                  onClick={() => setSelectedPreset('30m')}
                  className={`py-3 px-3 rounded-2xl border text-xs font-bold transition text-center ${
                    selectedPreset === '30m'
                      ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-950/60'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  30 Minutes
                </button>

                <button
                  type="button"
                  id="timer-preset-1h"
                  onClick={() => setSelectedPreset('1h')}
                  className={`py-3 px-3 rounded-2xl border text-xs font-bold transition text-center ${
                    selectedPreset === '1h'
                      ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-950/60'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  1 Hour
                </button>

                <button
                  type="button"
                  id="timer-preset-2h"
                  onClick={() => setSelectedPreset('2h')}
                  className={`py-3 px-3 rounded-2xl border text-xs font-bold transition text-center ${
                    selectedPreset === '2h'
                      ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-950/60'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  2 Hours
                </button>

                <button
                  type="button"
                  id="timer-preset-custom"
                  onClick={() => setSelectedPreset('custom')}
                  className={`col-span-2 sm:col-span-1 py-3 px-3 rounded-2xl border text-xs font-bold transition text-center ${
                    selectedPreset === 'custom'
                      ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-950/60'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Custom Time
                </button>
              </div>

              {/* Custom Minutes Input */}
              {selectedPreset === 'custom' && (
                <div className="pt-2 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 bg-slate-800/90 border border-violet-500/50 rounded-2xl p-2.5">
                    <Hourglass className="w-4 h-4 text-violet-400 ml-1 shrink-0" />
                    <input
                      type="number"
                      id="safety-checkin-custom-minutes-input"
                      min={1}
                      max={1440}
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(e.target.value)}
                      className="bg-transparent text-white text-xs font-bold w-full focus:outline-none"
                      placeholder="Enter minutes (e.g. 45)"
                    />
                    <span className="text-xs font-semibold text-slate-400 mr-1">mins</span>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Note / Activity Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Activity / Destination (Optional)
              </label>
              <div className="relative">
                <StickyNote className="w-4 h-4 text-violet-400 absolute left-3.5 top-3.5" />
                <textarea
                  id="safety-checkin-note-textarea"
                  rows={3}
                  value={optionalNote}
                  onChange={(e) => setOptionalNote(e.target.value)}
                  placeholder='e.g. "Meeting someone downtown at 5th and Pine."'
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl pl-10 pr-3 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-normal pl-1">
                Example: First date, Meeting SBA advisor, Facebook Marketplace pickup, Walking home from work, Uber ride, Hiking alone.
              </p>
            </div>

            {/* Start Button */}
            <button
              type="submit"
              id="safety-checkin-start-btn"
              disabled={isStarting}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-xl shadow-violet-950/80 transition active:scale-[0.98] flex items-center justify-center gap-2 border border-violet-400/30"
            >
              <Zap className="w-4 h-4 text-violet-200" />
              <span>{isStarting ? 'Starting Check-In...' : 'Start Check-In'}</span>
            </button>
          </form>
        ) : (
          /* Active Check-In Display */
          <div className="text-center space-y-6 animate-in fade-in duration-200 py-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Safety Timer Active</span>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                Time Remaining
              </p>
              {/* Big Digital Countdown Display */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-full border-8 border-violet-500/30 bg-gradient-to-b from-slate-900 to-slate-950 text-white flex flex-col items-center justify-center shadow-2xl shadow-violet-950/80 relative overflow-hidden border-t-violet-400">
                  <div className="absolute inset-0 bg-violet-600/10 rounded-full animate-pulse pointer-events-none" />
                  <Clock className="w-8 h-8 text-violet-400 mb-2" />
                  <span className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight">
                    {formatTimeRemaining(activeCheckIn.remainingSeconds)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {activeCheckIn.selectedDurationLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Optional Note Card Display */}
            {activeCheckIn.note && (
              <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-2xl text-left text-xs max-w-xs mx-auto">
                <div className="flex items-center gap-1.5 text-violet-300 font-bold mb-1">
                  <StickyNote className="w-3.5 h-3.5" />
                  <span>Activity Note:</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed italic">
                  "{activeCheckIn.note}"
                </p>
              </div>
            )}

            {/* Cancel Check-In Button */}
            <div className="pt-2 max-w-xs mx-auto">
              <button
                type="button"
                id="safety-checkin-cancel-btn"
                onClick={onCancelCheckIn}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl text-xs uppercase tracking-wider transition border border-slate-700 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4 text-slate-400" />
                <span>Cancel Check-In</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Prompt Overlay when Timer reaches Zero */}
      {activeCheckIn?.isActive && activeCheckIn?.isPromptShowing && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-50 flex flex-col justify-between p-6 sm:p-8 animate-in fade-in duration-200 text-center select-none">
          {/* Background Aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] bg-amber-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />

          {/* Prompt Header */}
          <div className="pt-2 z-10 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black tracking-widest uppercase">
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>CHECK-IN EXPIRED</span>
            </div>
          </div>

          {/* Center Message */}
          <div className="my-auto z-10 flex flex-col items-center justify-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                Are you safe?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
                Your Safety Check-In timer has completed. Please confirm your safety status.
              </p>
            </div>

            {/* Countdown Ring till Auto Emergency */}
            <div className="relative flex items-center justify-center my-2">
              <div className="w-36 h-36 rounded-full border-4 border-amber-500/50 bg-slate-900 text-white flex flex-col items-center justify-center shadow-xl">
                <span className="text-4xl font-black text-amber-400 font-mono">
                  {promptCountdown}s
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  Auto SOS
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-medium max-w-xs">
              If no response within <span className="text-amber-300 font-bold">{promptCountdown} seconds</span>, VERA will automatically trigger the emergency workflow.
            </p>
          </div>

          {/* Action Buttons: Safe, Need 15 More Minutes, Emergency Help */}
          <div className="space-y-2.5 z-10 max-w-xs w-full mx-auto pb-4">
            <button
              type="button"
              id="safety-prompt-im-safe-btn"
              onClick={onRespondSafe}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/80 transition active:scale-[0.98] flex items-center justify-center gap-2 border border-emerald-400/40"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>I'm Safe</span>
            </button>

            <button
              type="button"
              id="safety-prompt-need-15m-btn"
              onClick={onExtendCheckIn}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-violet-200 hover:text-white font-bold rounded-2xl text-xs sm:text-sm transition border border-slate-700 flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4 text-violet-400" />
              <span>Need 15 More Minutes</span>
            </button>

            <button
              type="button"
              id="safety-prompt-emergency-btn"
              onClick={() => onTriggerEmergency(activeCheckIn.note)}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-red-950/80 transition active:scale-[0.98] flex items-center justify-center gap-2 border border-red-400/40"
            >
              <ShieldAlert className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Emergency Help</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
