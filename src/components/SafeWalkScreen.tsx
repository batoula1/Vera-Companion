import React, { useState, useEffect } from 'react';
import { 
  Footprints, 
  Car, 
  MapPin, 
  Navigation2, 
  Clock, 
  ArrowLeft, 
  StickyNote, 
  Zap, 
  X, 
  CheckCircle2, 
  Hourglass, 
  ShieldAlert,
  AlertTriangle,
  Compass,
  Check
} from 'lucide-react';
import { UserProfile } from '../types';

interface SafeWalkScreenProps {
  user: UserProfile;
  onBack: () => void;
  onTriggerEmergency: (checkInNote?: string) => void;
  activeTrip: {
    docId: string | null;
    destination: string;
    transportMode: 'walking' | 'driving';
    startTime: string | null;
    expectedDurationLabel: string;
    totalSeconds: number;
    remainingSeconds: number;
    elapsedSeconds: number;
    note: string;
    isActive: boolean;
    isPromptShowing: boolean;
  } | null;
  onStartTrip: (
    destination: string, 
    transportMode: 'walking' | 'driving', 
    durationLabel: string, 
    seconds: number, 
    note: string
  ) => Promise<void>;
  onEndTrip: () => Promise<void>;
  onRespondSafe: () => Promise<void>;
  onExtendTrip: () => Promise<void>;
}

export const SafeWalkScreen: React.FC<SafeWalkScreenProps> = ({
  user,
  onBack,
  onTriggerEmergency,
  activeTrip,
  onStartTrip,
  onEndTrip,
  onRespondSafe,
  onExtendTrip
}) => {
  // Setup view form state
  const [destinationInput, setDestinationInput] = useState<string>('');
  const [transportMode, setTransportMode] = useState<'walking' | 'driving'>('walking');
  const [selectedPreset, setSelectedPreset] = useState<'15m' | '30m' | '45m' | '1h' | 'custom'>('30m');
  const [customMinutes, setCustomMinutes] = useState<string>('20');
  const [optionalNote, setOptionalNote] = useState<string>('');
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Prompt 60-second countdown
  const [promptCountdown, setPromptCountdown] = useState<number>(60);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (activeTrip?.isActive && activeTrip?.isPromptShowing) {
      if (promptCountdown > 0) {
        timer = setTimeout(() => {
          setPromptCountdown(prev => prev - 1);
        }, 1000);
      } else {
        // 60 seconds passed with no response -> Auto trigger emergency!
        const emergencyContextNote = `Safe Walk trip to "${activeTrip.destination}" expired without user response. Mode: ${activeTrip.transportMode}. ${activeTrip.note ? `Note: ${activeTrip.note}` : ''}`;
        onTriggerEmergency(emergencyContextNote);
      }
    } else {
      setPromptCountdown(60);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeTrip?.isActive, activeTrip?.isPromptShowing, promptCountdown]);

  const getDurationDetails = (): { label: string; seconds: number } => {
    switch (selectedPreset) {
      case '15m':
        return { label: '15 minutes', seconds: 15 * 60 };
      case '30m':
        return { label: '30 minutes', seconds: 30 * 60 };
      case '45m':
        return { label: '45 minutes', seconds: 45 * 60 };
      case '1h':
        return { label: '1 hour', seconds: 60 * 60 };
      case 'custom':
        const mins = Math.max(1, Math.min(1440, parseInt(customMinutes, 10) || 15));
        return { label: `${mins} minutes`, seconds: mins * 60 };
      default:
        return { label: '30 minutes', seconds: 30 * 60 };
    }
  };

  const handleStartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationInput.trim()) {
      setValidationError('Please enter your destination address or place name.');
      return;
    }
    setValidationError(null);
    if (isStarting) return;
    setIsStarting(true);

    try {
      const { label, seconds } = getDurationDetails();
      await onStartTrip(
        destinationInput.trim(),
        transportMode,
        label,
        seconds,
        optionalNote.trim()
      );
    } catch (err) {
      console.error('Failed to start safe walk:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const formatSeconds = (totalSecs: number) => {
    if (totalSecs <= 0) return '00:00';
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getEstimatedArrivalTimeStr = (remainingSecs: number) => {
    const target = new Date(Date.now() + remainingSecs * 1000);
    return target.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="min-h-full bg-slate-900 text-white flex flex-col justify-between p-5 relative pb-24">
      {/* Header Bar */}
      <div className="flex justify-between items-center z-10 mb-6">
        <button
          type="button"
          id="safewalk-back-btn"
          onClick={onBack}
          className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition flex items-center gap-2 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
          <Footprints className="w-4 h-4 text-cyan-400" />
          <span>SAFE WALK / DRIVE</span>
        </div>
      </div>

      {/* Main Form or Active Screen */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {!activeTrip?.isActive ? (
          /* Trip Setup Form */
          <form onSubmit={handleStartSubmit} className="space-y-5 animate-in fade-in duration-200">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                <Footprints className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">
                Safe Walk Setup
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Track your walking or driving route with expected arrival monitoring. If you don't confirm arrival, VERA will alert your guardians.
              </p>
            </div>

            {/* Destination Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Destination <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5 shrink-0" />
                <input
                  type="text"
                  id="safewalk-destination-input"
                  value={destinationInput}
                  onChange={(e) => {
                    setDestinationInput(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="e.g. 123 Main St, Central Park, Home"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl pl-10 pr-3 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>
              {validationError && (
                <p className="text-[11px] text-red-400 font-medium pl-1">{validationError}</p>
              )}
            </div>

            {/* Mode Selection (Walking or Driving) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Transport Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="safewalk-mode-walking-btn"
                  onClick={() => setTransportMode('walking')}
                  className={`py-3 px-4 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                    transportMode === 'walking'
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-950/60'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Footprints className="w-4 h-4" />
                  <span>Walking</span>
                </button>

                <button
                  type="button"
                  id="safewalk-mode-driving-btn"
                  onClick={() => setTransportMode('driving')}
                  className={`py-3 px-4 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                    transportMode === 'driving'
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-950/60'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Car className="w-4 h-4" />
                  <span>Driving</span>
                </button>
              </div>
            </div>

            {/* Duration Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Expected Arrival Time
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  id="safewalk-preset-15m"
                  onClick={() => setSelectedPreset('15m')}
                  className={`py-2.5 px-2 rounded-2xl border text-xs font-bold transition text-center ${
                    selectedPreset === '15m'
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-950/60'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  15 Minutes
                </button>

                <button
                  type="button"
                  id="safewalk-preset-30m"
                  onClick={() => setSelectedPreset('30m')}
                  className={`py-2.5 px-2 rounded-2xl border text-xs font-bold transition text-center ${
                    selectedPreset === '30m'
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-950/60'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  30 Minutes
                </button>

                <button
                  type="button"
                  id="safewalk-preset-45m"
                  onClick={() => setSelectedPreset('45m')}
                  className={`py-2.5 px-2 rounded-2xl border text-xs font-bold transition text-center ${
                    selectedPreset === '45m'
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-950/60'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  45 Minutes
                </button>

                <button
                  type="button"
                  id="safewalk-preset-1h"
                  onClick={() => setSelectedPreset('1h')}
                  className={`py-2.5 px-2 rounded-2xl border text-xs font-bold transition text-center ${
                    selectedPreset === '1h'
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-950/60'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  1 Hour
                </button>

                <button
                  type="button"
                  id="safewalk-preset-custom"
                  onClick={() => setSelectedPreset('custom')}
                  className={`col-span-2 sm:col-span-1 py-2.5 px-2 rounded-2xl border text-xs font-bold transition text-center ${
                    selectedPreset === 'custom'
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-950/60'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Custom Time
                </button>
              </div>

              {selectedPreset === 'custom' && (
                <div className="pt-1 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 bg-slate-800/90 border border-cyan-500/50 rounded-2xl p-2.5">
                    <Hourglass className="w-4 h-4 text-cyan-400 ml-1 shrink-0" />
                    <input
                      type="number"
                      id="safewalk-custom-minutes-input"
                      min={1}
                      max={1440}
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(e.target.value)}
                      className="bg-transparent text-white text-xs font-bold w-full focus:outline-none"
                      placeholder="Enter duration in minutes"
                    />
                    <span className="text-xs font-semibold text-slate-400 mr-1">mins</span>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Note Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Activity / Destination (Optional)
              </label>
              <div className="relative">
                <StickyNote className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5" />
                <textarea
                  id="safewalk-note-textarea"
                  rows={2}
                  value={optionalNote}
                  onChange={(e) => setOptionalNote(e.target.value)}
                  placeholder="e.g. Walking home from work, Uber ride, Night jog"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl pl-10 pr-3 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-normal pl-1">
                Example: First date, Meeting SBA advisor, Facebook Marketplace pickup, Walking home from work, Uber ride, Hiking alone.
              </p>
            </div>

            {/* Start Button */}
            <button
              type="submit"
              id="safewalk-start-btn"
              disabled={isStarting}
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-xl shadow-cyan-950/80 transition active:scale-[0.98] flex items-center justify-center gap-2 border border-cyan-400/30"
            >
              <Zap className="w-4 h-4 text-cyan-200" />
              <span>
                {isStarting 
                  ? 'Initiating Trip...' 
                  : `Start Safe ${transportMode === 'driving' ? 'Drive' : 'Walk'}`}
              </span>
            </button>
          </form>
        ) : (
          /* Live Progress Screen */
          <div className="space-y-5 animate-in fade-in duration-200 py-2">
            {/* Status Badge */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                {activeTrip.transportMode === 'driving' ? (
                  <span className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5" />
                    <span>Safe Drive Active</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Footprints className="w-3.5 h-3.5" />
                    <span>Safe Walk Active</span>
                  </span>
                )}
              </div>
            </div>

            {/* Destination & Location Live Card */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-3.5 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                  <Navigation2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                    Destination
                  </p>
                  <h3 className="text-sm font-black text-white truncate">
                    {activeTrip.destination}
                  </h3>
                </div>
              </div>

              <div className="border-t border-slate-700/60 pt-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-700/60 text-slate-300 flex items-center justify-center shrink-0 border border-slate-600/40">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Current Location
                  </p>
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {user.lastLocation?.address || 'Seattle, WA (GPS Active)'}
                  </p>
                </div>
              </div>

              {activeTrip.note && (
                <div className="border-t border-slate-700/60 pt-2.5 text-xs text-slate-300 italic">
                  <span className="font-bold text-slate-400 not-italic">Note: </span>
                  "{activeTrip.note}"
                </div>
              )}
            </div>

            {/* Live Timers Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Elapsed Time */}
              <div className="bg-slate-800/80 border border-slate-700/70 p-4 rounded-2xl text-center space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Elapsed Time
                </p>
                <div className="text-2xl font-black font-mono text-slate-200">
                  {formatSeconds(activeTrip.elapsedSeconds)}
                </div>
                <p className="text-[10px] text-slate-500 font-semibold">
                  Started {activeTrip.startTime ? new Date(activeTrip.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                </p>
              </div>

              {/* Time Remaining */}
              <div className="bg-cyan-950/50 border border-cyan-500/40 p-4 rounded-2xl text-center space-y-1 relative overflow-hidden">
                <p className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                  Remaining Time
                </p>
                <div className="text-2xl font-black font-mono text-white">
                  {formatSeconds(activeTrip.remainingSeconds)}
                </div>
                <p className="text-[10px] text-cyan-200 font-bold">
                  ETA ~ {getEstimatedArrivalTimeStr(activeTrip.remainingSeconds)}
                </p>
              </div>
            </div>

            {/* End Trip Button */}
            <div className="pt-2">
              <button
                type="button"
                id="safewalk-end-trip-btn"
                onClick={onEndTrip}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/80 transition active:scale-[0.98] flex items-center justify-center gap-2 border border-emerald-400/40"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <span>Arrived Safely - End Trip</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Prompt Overlay when arrival time is reached */}
      {activeTrip?.isActive && activeTrip?.isPromptShowing && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-50 flex flex-col justify-between p-6 sm:p-8 animate-in fade-in duration-200 text-center select-none">
          {/* Pulsing Aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] bg-cyan-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />

          {/* Header */}
          <div className="pt-2 z-10 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black tracking-widest uppercase">
              <Compass className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>ARRIVING AT DESTINATION</span>
            </div>
          </div>

          {/* Message & Timer */}
          <div className="my-auto z-10 flex flex-col items-center justify-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                Have you arrived safely?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
                Your expected arrival time for <span className="text-cyan-300 font-bold">"{activeTrip.destination}"</span> has been reached.
              </p>
            </div>

            {/* Countdown Circle */}
            <div className="relative flex items-center justify-center my-2">
              <div className="w-36 h-36 rounded-full border-4 border-cyan-500/50 bg-slate-900 text-white flex flex-col items-center justify-center shadow-2xl shadow-cyan-950/80">
                <span className="text-4xl font-black text-cyan-400 font-mono">
                  {promptCountdown}s
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  Auto SOS
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-medium max-w-xs">
              If no response within <span className="text-cyan-300 font-bold">{promptCountdown} seconds</span>, VERA will automatically trigger the emergency workflow.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 z-10 max-w-xs w-full mx-auto pb-4">
            <button
              type="button"
              id="safewalk-prompt-safe-btn"
              onClick={onRespondSafe}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/80 transition active:scale-[0.98] flex items-center justify-center gap-2 border border-emerald-400/40"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>Yes, I'm Safe</span>
            </button>

            <button
              type="button"
              id="safewalk-prompt-extend-btn"
              onClick={onExtendTrip}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-cyan-200 hover:text-white font-bold rounded-2xl text-xs sm:text-sm transition border border-slate-700 flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Extend Trip by 15 Minutes</span>
            </button>

            <button
              type="button"
              id="safewalk-prompt-emergency-btn"
              onClick={() => {
                const emergencyNote = `Safe Walk trip to "${activeTrip.destination}" emergency help requested. Mode: ${activeTrip.transportMode}. ${activeTrip.note ? `Note: ${activeTrip.note}` : ''}`;
                onTriggerEmergency(emergencyNote);
              }}
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
