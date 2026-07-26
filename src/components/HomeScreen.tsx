import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Users, 
  AlertTriangle, 
  Clock, 
  Footprints, 
  PhoneCall, 
  Sparkles, 
  CheckCircle2, 
  Radio, 
  ShieldAlert, 
  Compass, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Lightbulb, 
  Activity, 
  FileText,
  Lock,
  ArrowUpRight,
  History
} from 'lucide-react';
import { UserProfile, TrustedContact, ScreenType } from '../types';

interface HomeScreenProps {
  user: UserProfile;
  contacts: TrustedContact[];
  onNavigate: (screen: ScreenType) => void;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onLogout: () => void;
  activeCheckInSummary?: {
    isActive: boolean;
    remainingText: string;
  };
  activeSafeWalkSummary?: {
    isActive: boolean;
    destination: string;
    remainingText: string;
  };
  activeFakeCallSummary?: {
    isScheduled: boolean;
    callerName: string;
    remainingText: string;
  };
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  contacts,
  onNavigate,
  onUpdateUser,
  onLogout,
  activeCheckInSummary,
  activeSafeWalkSummary,
  activeFakeCallSummary
}) => {
  const [currentLocation, setCurrentLocation] = useState<string>('Detecting location...');

  // Detect location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          setCurrentLocation(`Lat: ${lat}, Lng: ${lng}`);
        },
        () => {
          setCurrentLocation('Location Active (GPS Ready)');
        },
        { timeout: 5000 }
      );
    } else {
      setCurrentLocation('GPS Active');
    }
  }, []);

  // Greeting based on current hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const firstName = user.displayName?.trim() ? user.displayName.split(' ')[0] : 'User';

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Daily rotating safety tips
  const safetyTips = [
    "Share your location before meeting someone new.",
    "Trust your instincts — if a situation feels unsafe, trigger a Check-In or Safe Walk.",
    "Stay aware of your surroundings and keep your phone accessible.",
    "Keep your phone charged before traveling alone or at night.",
    "Ensure you have at least 2 trusted guardians configured for rapid alerts.",
    "Practice triggering Fake Call so you can quickly exit uncomfortable scenarios.",
    "Keep camera and audio evidence permissions enabled for emergency recording."
  ];

  // Rotate tip based on day of year
  const getDailyTip = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return safetyTips[dayOfYear % safetyTips.length];
  };

  const dailyTip = getDailyTip();

  // Load recent activity log items from localStorage or active state
  const [recentActivities, setRecentActivities] = useState<Array<{
    type: 'checkin' | 'safewalk' | 'emergency' | 'fakecall';
    title: string;
    description: string;
    time: string;
  }>>([]);

  useEffect(() => {
    const activities: Array<{
      type: 'checkin' | 'safewalk' | 'emergency' | 'fakecall';
      title: string;
      description: string;
      time: string;
    }> = [];

    // Add active / recent summaries
    if (activeCheckInSummary?.isActive) {
      activities.push({
        type: 'checkin',
        title: 'Safety Check-In Active',
        description: `Timer running: ${activeCheckInSummary.remainingText}`,
        time: 'Active now'
      });
    }

    if (activeSafeWalkSummary?.isActive) {
      activities.push({
        type: 'safewalk',
        title: 'Safe Walk Active',
        description: `En route to ${activeSafeWalkSummary.destination} (${activeSafeWalkSummary.remainingText})`,
        time: 'Active now'
      });
    }

    if (activeFakeCallSummary?.isScheduled) {
      activities.push({
        type: 'fakecall',
        title: 'Fake Call Scheduled',
        description: `Simulated call from ${activeFakeCallSummary.callerName} in ${activeFakeCallSummary.remainingText}`,
        time: 'Scheduled'
      });
    }

    // Load stored history logs
    try {
      const stored = localStorage.getItem('vera_activity_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            if (activities.length < 4) {
              activities.push(item);
            }
          });
        }
      }
    } catch (e) {
      // ignore
    }

    setRecentActivities(activities);
  }, [activeCheckInSummary, activeSafeWalkSummary, activeFakeCallSummary]);

  return (
    <div className="min-h-full bg-slate-950 text-slate-100 pb-28 space-y-6 max-w-2xl mx-auto px-4 pt-6 select-none">
      
      {/* 1. HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-violet-950/70 p-5 rounded-3xl border border-slate-800 shadow-2xl flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
              {getGreeting()}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {firstName}
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            {formattedDate}
          </p>
        </div>

        {/* Profile Avatar / Photo & Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="home-settings-header-btn"
            onClick={() => onNavigate('settings')}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            id="home-logout-header-btn"
            onClick={onLogout}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 p-0.5 shadow-lg border border-violet-400/30 shrink-0 overflow-hidden flex items-center justify-center">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={firstName} 
                className="w-full h-full object-cover rounded-[14px]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-white font-black text-lg">
                {firstName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. SAFETY STATUS CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
                Safety Status
              </span>
              <span className="text-sm font-black text-emerald-400 tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Protected
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <MapPin className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-300 truncate max-w-[140px]">
              {currentLocation}
            </span>
          </div>
        </div>

        {/* Status Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* GPS Status */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1">
              <Compass className="w-3 h-3 text-violet-400" /> GPS Status
            </span>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </div>
          </div>

          {/* Trusted Contacts */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1">
              <Users className="w-3 h-3 text-violet-400" /> Contacts
            </span>
            <div className="text-xs font-bold text-slate-100">
              {contacts.length} Guardians
            </div>
          </div>

          {/* Emergency Evidence Status */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1">
              <Radio className="w-3 h-3 text-amber-400" /> Evidence
            </span>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </div>
          </div>
        </div>
      </div>

      {/* 3. EMERGENCY SOS BUTTON (CENTERED HERO ACTION) */}
      <div className="flex flex-col items-center justify-center py-2 space-y-3">
        <div className="relative flex items-center justify-center">
          {/* Outer Pulse Rings */}
          <div className="absolute w-44 h-44 rounded-full bg-red-600/20 animate-ping pointer-events-none" />
          <div className="absolute w-36 h-36 rounded-full bg-red-600/30 animate-pulse pointer-events-none" />

          {/* SOS Hero Trigger Button */}
          <button
            type="button"
            id="home-center-sos-btn"
            onClick={() => onNavigate('emergency')}
            className="relative z-10 w-32 h-32 rounded-full bg-gradient-to-b from-red-500 via-red-600 to-rose-700 text-white shadow-2xl shadow-red-900/80 hover:shadow-red-600/50 flex flex-col items-center justify-center gap-1 border-4 border-red-400/50 transform active:scale-95 transition cursor-pointer group"
          >
            <ShieldAlert className="w-10 h-10 text-white animate-bounce group-hover:scale-110 transition" />
            <span className="text-lg font-black tracking-widest text-white drop-shadow-md">
              SOS
            </span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-red-100 opacity-90">
              Emergency
            </span>
          </button>
        </div>

        <p className="text-xs font-bold text-slate-400 text-center flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>Tap for instant distress alert & evidence dispatch</span>
        </p>
      </div>

      {/* 4. QUICK ACTIONS */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-wider text-violet-400 px-1 flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <span>Quick Actions</span>
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {/* Safe Walk Card */}
          <button
            type="button"
            id="home-action-safewalk-btn"
            onClick={() => onNavigate('safe_walk')}
            className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 rounded-3xl text-left space-y-2.5 shadow-xl transition transform active:scale-98 group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 group-hover:scale-105 transition">
                <Footprints className="w-5 h-5" />
              </div>
              {activeSafeWalkSummary?.isActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1">
                <span>Safe Walk</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition" />
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                Track destination ETA with automated safety checks.
              </p>
            </div>
          </button>

          {/* Safety Check-In Card */}
          <button
            type="button"
            id="home-action-checkin-btn"
            onClick={() => onNavigate('safety_checkin')}
            className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-violet-500/50 rounded-3xl text-left space-y-2.5 shadow-xl transition transform active:scale-98 group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-violet-500/20 text-violet-300 border border-violet-500/30 group-hover:scale-105 transition">
                <Clock className="w-5 h-5" />
              </div>
              {activeCheckInSummary?.isActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1">
                <span>Safety Check-In</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-violet-400 transition" />
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                Activity countdown timer with alert escalation.
              </p>
            </div>
          </button>

          {/* Fake Call Card */}
          <button
            type="button"
            id="home-action-fakecall-btn"
            onClick={() => onNavigate('fake_call')}
            className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 rounded-3xl text-left space-y-2.5 shadow-xl transition transform active:scale-98 group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 group-hover:scale-105 transition">
                <PhoneCall className="w-5 h-5" />
              </div>
              {activeFakeCallSummary?.isScheduled && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1">
                <span>Fake Call</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                Simulated call with custom voice script.
              </p>
            </div>
          </button>

          {/* Emergency History Card */}
          <button
            type="button"
            id="home-action-history-btn"
            onClick={() => onNavigate('history')}
            className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-3xl text-left space-y-2.5 shadow-xl transition transform active:scale-98 group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 group-hover:scale-105 transition">
                <History className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1">
                <span>Emergency History</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition" />
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                Review past reports, SOS logs & evidence.
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* 5. RECENT ACTIVITY */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-violet-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Recent Activity</span>
          </h2>
          <button
            type="button"
            id="home-view-all-history-btn"
            onClick={() => onNavigate('history')}
            className="text-[11px] font-bold text-violet-300 hover:text-white flex items-center gap-1"
          >
            <span>View History</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          {recentActivities.length === 0 ? (
            <div className="p-6 text-center space-y-2 bg-slate-950/60 rounded-2xl border border-slate-800/80">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-400">
                No recent activity
              </p>
              <p className="text-[11px] text-slate-500">
                Your safety check-ins, safe walk sessions, and SOS reports will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentActivities.map((act, index) => (
                <div key={index} className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0">
                      {act.type === 'checkin' && <Clock className="w-4 h-4 text-violet-300" />}
                      {act.type === 'safewalk' && <Footprints className="w-4 h-4 text-cyan-300" />}
                      {act.type === 'emergency' && <ShieldAlert className="w-4 h-4 text-red-400" />}
                      {act.type === 'fakecall' && <PhoneCall className="w-4 h-4 text-amber-300" />}
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white">{act.title}</div>
                      <div className="text-[11px] text-slate-400">{act.description}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold shrink-0">
                    {act.time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6. DAILY SAFETY TIP */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-wider text-violet-400 px-1 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span>Daily Safety Tip</span>
        </h2>

        <div className="bg-gradient-to-r from-violet-950/60 via-slate-900 to-indigo-950/60 border border-violet-800/40 rounded-3xl p-5 shadow-xl flex items-start gap-3.5 relative overflow-hidden">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider">
              Tip of the Day
            </span>
            <p className="text-xs sm:text-sm font-medium text-slate-100 leading-relaxed">
              "{dailyTip}"
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};
