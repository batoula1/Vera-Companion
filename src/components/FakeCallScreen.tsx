import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  PhoneCall, 
  Clock, 
  User, 
  Volume2, 
  ArrowLeft, 
  Sparkles, 
  MicOff, 
  Grid, 
  VolumeX, 
  Zap, 
  X, 
  Check,
  Music
} from 'lucide-react';
import { UserProfile } from '../types';

interface FakeCallScreenProps {
  user: UserProfile;
  onBack: () => void;
  activeScheduledCall: {
    callerName: string;
    delaySeconds: number;
    remainingSeconds: number;
    ringtone: string;
    voiceMessage: string;
    isRinging: boolean;
    isInCall: boolean;
  } | null;
  onScheduleCall: (
    callerName: string, 
    delaySeconds: number, 
    ringtone: string, 
    voiceMessage: string
  ) => void;
  onCancelScheduledCall: () => void;
  onTriggerCallNow: () => void;
  onAnswerCall: () => void;
  onDeclineCall: () => void;
  onEndCall: () => void;
}

export const FakeCallScreen: React.FC<FakeCallScreenProps> = ({
  user,
  onBack,
  activeScheduledCall,
  onScheduleCall,
  onCancelScheduledCall,
  onTriggerCallNow,
  onAnswerCall,
  onDeclineCall,
  onEndCall
}) => {
  // Form State
  const [selectedCaller, setSelectedCaller] = useState<string>('Mom');
  const [customCallerInput, setCustomCallerInput] = useState<string>('');
  const [selectedDelay, setSelectedDelay] = useState<number>(10); // seconds
  const [selectedRingtone, setSelectedRingtone] = useState<string>('Classic Ring');
  const [selectedMessage, setSelectedMessage] = useState<string>(
    "Hi! I'm outside waiting for you. Are you almost here?"
  );

  // In-Call UI Controls
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
  const [callDuration, setCallDuration] = useState<number>(0);

  // Sound Synth Ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle Speech & Ringtone audio effects
  useEffect(() => {
    // If call is ringing, play simulated ringtone sound
    if (activeScheduledCall?.isRinging) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;

          const playRingToneBurst = () => {
            if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
            const now = ctx.currentTime;
            
            // Dual frequency standard phone ring (440Hz + 480Hz)
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(440, now);
            osc2.frequency.setValueAtTime(480, now);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 1.8);
            osc2.stop(now + 1.8);
          };

          playRingToneBurst();
          ringIntervalRef.current = setInterval(playRingToneBurst, 3000);
        }
      } catch (err) {
        console.warn('Audio ringtone context error:', err);
      }
    } else {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    }

    return () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, [activeScheduledCall?.isRinging]);

  // Handle speech when call is answered
  useEffect(() => {
    if (activeScheduledCall?.isInCall) {
      setCallDuration(0);
      const timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Play prerecorded simulated voice speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // stop any prior speech
        const msg = new SpeechSynthesisUtterance(activeScheduledCall.voiceMessage);
        msg.rate = 1.0;
        msg.pitch = 1.1;
        window.speechSynthesis.speak(msg);
      }

      return () => {
        clearInterval(timer);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, [activeScheduledCall?.isInCall, activeScheduledCall?.voiceMessage]);

  const effectiveCallerName = 
    selectedCaller === 'Custom' 
      ? (customCallerInput.trim() || 'Incoming Call') 
      : selectedCaller;

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onScheduleCall(effectiveCallerName, selectedDelay, selectedRingtone, selectedMessage);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Render Full Screen Incoming Call Modal if Ringing
  if (activeScheduledCall?.isRinging) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col justify-between p-8 text-white select-none animate-in fade-in duration-300">
        {/* Glowing Background Blur */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />

        {/* Top Caller Info */}
        <div className="pt-12 text-center z-10 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Incoming Call
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {activeScheduledCall.callerName}
          </h1>
          <p className="text-sm font-medium text-emerald-400 animate-pulse">
            Mobile...
          </p>
        </div>

        {/* Center Caller Avatar Icon */}
        <div className="z-10 flex flex-col items-center my-auto">
          <div className="w-32 h-32 rounded-full bg-slate-800/80 border-4 border-slate-700/80 flex items-center justify-center text-slate-300 shadow-2xl relative">
            <User className="w-16 h-16" />
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30" />
          </div>
        </div>

        {/* Bottom Answer / Decline Buttons */}
        <div className="z-10 max-w-xs mx-auto w-full pb-12 flex justify-around items-center">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              id="fake-call-decline-btn"
              onClick={onDeclineCall}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-950/80 transition active:scale-95 border border-red-400/30"
            >
              <PhoneOff className="w-8 h-8" />
            </button>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Decline
            </span>
          </div>

          {/* Answer Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              id="fake-call-answer-btn"
              onClick={onAnswerCall}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-950/80 transition active:scale-95 border border-emerald-400/30 animate-bounce"
            >
              <PhoneCall className="w-8 h-8" />
            </button>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Answer
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Render Active In-Call Screen
  if (activeScheduledCall?.isInCall) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col justify-between p-8 text-white select-none animate-in fade-in duration-200">
        {/* Top Caller Info & Timer */}
        <div className="pt-12 text-center z-10 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Connected Call
          </p>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {activeScheduledCall.callerName}
          </h1>
          <p className="text-lg font-mono font-bold text-slate-300">
            {formatTime(callDuration)}
          </p>
        </div>

        {/* Center Avatar */}
        <div className="z-10 flex flex-col items-center my-auto">
          <div className="w-28 h-28 rounded-full bg-slate-800 border-2 border-emerald-500/50 flex items-center justify-center text-slate-200 shadow-xl mb-4">
            <User className="w-14 h-14" />
          </div>
          <div className="bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-2xl max-w-xs text-center">
            <p className="text-xs text-emerald-300 font-medium italic">
              "{activeScheduledCall.voiceMessage}"
            </p>
          </div>
        </div>

        {/* In-Call Controls */}
        <div className="z-10 max-w-xs mx-auto w-full pb-10 space-y-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-1 transition ${
                isMuted 
                  ? 'bg-white text-slate-900 border-white' 
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <MicOff className="w-5 h-5" />
              <span className="text-[10px] font-bold">Mute</span>
            </button>

            <button
              type="button"
              className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 flex flex-col items-center justify-center gap-1"
            >
              <Grid className="w-5 h-5" />
              <span className="text-[10px] font-bold">Keypad</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-1 transition ${
                isSpeakerOn 
                  ? 'bg-emerald-600 text-white border-emerald-400' 
                  : 'bg-slate-800/80 text-slate-300 border-slate-700'
              }`}
            >
              <Volume2 className="w-5 h-5" />
              <span className="text-[10px] font-bold">Speaker</span>
            </button>
          </div>

          {/* End Call Button */}
          <div className="flex justify-center">
            <button
              type="button"
              id="fake-call-end-call-btn"
              onClick={onEndCall}
              className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-950/80 transition active:scale-95 border border-red-400/30"
            >
              <PhoneOff className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-900 text-white flex flex-col justify-between p-5 relative pb-24">
      {/* Header */}
      <div className="flex justify-between items-center z-10 mb-6">
        <button
          type="button"
          id="fake-call-back-btn"
          onClick={onBack}
          className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition flex items-center gap-2 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
          <Phone className="w-4 h-4 text-indigo-400" />
          <span>FAKE CALL GENERATOR</span>
        </div>
      </div>

      {/* Main Body Content */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {activeScheduledCall && !activeScheduledCall.isRinging && !activeScheduledCall.isInCall ? (
          /* Active Scheduled Countdown Card */
          <div className="text-center space-y-6 animate-in fade-in duration-200 py-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>Call Scheduled</span>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                Incoming Call From <span className="text-white font-black">{activeScheduledCall.callerName}</span>
              </p>
              
              {/* Big Digital Countdown */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="w-48 h-48 rounded-full border-4 border-indigo-500/40 bg-gradient-to-b from-slate-900 to-slate-950 text-white flex flex-col items-center justify-center shadow-2xl relative">
                  <Clock className="w-8 h-8 text-indigo-400 mb-2" />
                  <span className="text-4xl font-black font-mono text-white">
                    {activeScheduledCall.remainingSeconds}s
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Countdown
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Trigger Now or Cancel */}
            <div className="space-y-3 max-w-xs mx-auto">
              <button
                type="button"
                id="fake-call-trigger-now-btn"
                onClick={onTriggerCallNow}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-2 border border-emerald-400/30"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Trigger Ringing Now</span>
              </button>

              <button
                type="button"
                id="fake-call-cancel-btn"
                onClick={onCancelScheduledCall}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs uppercase tracking-wider transition border border-slate-700 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                <span>Cancel Fake Call</span>
              </button>
            </div>
          </div>
        ) : (
          /* Fake Call Setup Form */
          <form onSubmit={handleStartSubmit} className="space-y-5 animate-in fade-in duration-200">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                <Phone className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">
                Fake Call Setup
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Discreetly exit uncomfortable or unsafe situations with a realistic simulated incoming phone call.
              </p>
            </div>

            {/* Delay Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Schedule Call Delay
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '10s', sec: 10 },
                  { label: '30s', sec: 30 },
                  { label: '1 min', sec: 60 },
                  { label: '5 min', sec: 300 }
                ].map((item) => (
                  <button
                    key={item.sec}
                    type="button"
                    onClick={() => setSelectedDelay(item.sec)}
                    className={`py-3 rounded-2xl border text-xs font-bold transition text-center ${
                      selectedDelay === item.sec
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-950/60'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Caller Name Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Caller Name
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Mom', 'Dad', 'Friend', 'Work', 'Custom'].map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedCaller(name)}
                    className={`py-2.5 px-2 rounded-2xl border text-xs font-bold transition text-center ${
                      selectedCaller === name
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-950/60'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              {selectedCaller === 'Custom' && (
                <div className="pt-1 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 bg-slate-800/90 border border-indigo-500/50 rounded-2xl p-2.5">
                    <User className="w-4 h-4 text-indigo-400 ml-1 shrink-0" />
                    <input
                      type="text"
                      id="fake-call-custom-caller-input"
                      value={customCallerInput}
                      onChange={(e) => setCustomCallerInput(e.target.value)}
                      className="bg-transparent text-white text-xs font-bold w-full focus:outline-none"
                      placeholder="Enter custom caller name (e.g. Alex)"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ringtone Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Ringtone Sound
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Classic Ring', 'Chime Alert', 'Digital Pulse', 'Vibe Tone'].map((rt) => (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => setSelectedRingtone(rt)}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition text-left flex items-center justify-between ${
                      selectedRingtone === rt
                        ? 'bg-slate-800 border-indigo-500 text-indigo-300'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Music className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{rt}</span>
                    </span>
                    {selectedRingtone === rt && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Audio Message Script */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Simulated Audio Script
              </label>
              <select
                value={selectedMessage}
                onChange={(e) => setSelectedMessage(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Hi! I'm outside waiting for you. Are you almost here?">
                  "Hi! I'm outside waiting for you. Are you almost here?"
                </option>
                <option value="Hey, where are you? We are starting the team meeting right now.">
                  "Hey, where are you? We are starting the meeting right now."
                </option>
                <option value="Hi honey, just checking in to make sure you are on your way home.">
                  "Hi honey, just checking in to make sure you're on your way home."
                </option>
                <option value="Hey! I need your help with something urgently, can you answer?">
                  "Hey! I need your help with something urgently, can you answer?"
                </option>
              </select>
            </div>

            {/* Start Button */}
            <button
              type="submit"
              id="fake-call-schedule-btn"
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-xl shadow-indigo-950/80 transition active:scale-[0.98] flex items-center justify-center gap-2 border border-indigo-400/30"
            >
              <Zap className="w-4 h-4 text-indigo-200" />
              <span>Schedule Fake Call ({selectedDelay}s)</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
