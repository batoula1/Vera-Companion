import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  MapPin, 
  Bell, 
  Camera, 
  Mic, 
  PhoneCall, 
  Footprints, 
  Timer, 
  FileText, 
  Sparkles, 
  AlertOctagon, 
  UserPlus, 
  Users, 
  Check, 
  X, 
  Play, 
  PhoneOff, 
  RefreshCw,
  Info,
  ChevronRight,
  User,
  Heart,
  Lock
} from 'lucide-react';
import { UserProfile, TrustedContact } from '../types';
import { db, doc, addDoc, collection, updateDoc, setDoc } from '../lib/firebase';

interface OnboardingScreenProps {
  user: UserProfile;
  contacts: TrustedContact[];
  onContactsChange: (contacts: TrustedContact[]) => void;
  onCompleteOnboarding: () => void;
  onSkipOnboarding: () => void;
  isReplay?: boolean;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  user,
  contacts,
  onContactsChange,
  onCompleteOnboarding,
  onSkipOnboarding,
  isReplay = false
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Permission status states
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [notificationStatus, setNotificationStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [cameraStatus, setCameraStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [micStatus, setMicStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [requestingPerms, setRequestingPerms] = useState<boolean>(false);

  // Trusted contact form state
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('Parent');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);
  const [addingContact, setAddingContact] = useState(false);
  const [contactSuccessToast, setContactSuccessToast] = useState<string | null>(null);

  // Test VERA demo state
  const [activeDemo, setActiveDemo] = useState<'none' | 'sos' | 'safewalk' | 'checkin' | 'fakecall'>('none');
  const [demoSosSeconds, setDemoSosSeconds] = useState(3);
  const [demoSosSent, setDemoSosSent] = useState(false);
  const [demoWalkSeconds, setDemoWalkSeconds] = useState(5);
  const [demoWalkCompleted, setDemoWalkCompleted] = useState(false);
  const [demoCheckInSeconds, setDemoCheckInSeconds] = useState(3);
  const [demoCheckInAnswered, setDemoCheckInAnswered] = useState(false);
  const [demoFakeCallRinging, setDemoFakeCallRinging] = useState(false);
  const [demoFakeCallInCall, setDemoFakeCallInCall] = useState(false);

  // Check current permission statuses on step 3 load
  useEffect(() => {
    if (currentStep === 3) {
      checkExistingPermissions();
    }
  }, [currentStep]);

  const checkExistingPermissions = async () => {
    if ('permissions' in navigator) {
      try {
        const geo = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (geo.state === 'granted') setLocationStatus('granted');
        else if (geo.state === 'denied') setLocationStatus('denied');
      } catch (e) {}

      try {
        const cam = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (cam.state === 'granted') setCameraStatus('granted');
        else if (cam.state === 'denied') setCameraStatus('denied');
      } catch (e) {}

      try {
        const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (mic.state === 'granted') setMicStatus('granted');
        else if (mic.state === 'denied') setMicStatus('denied');
      } catch (e) {}
    }

    if ('Notification' in window) {
      if (Notification.permission === 'granted') setNotificationStatus('granted');
      else if (Notification.permission === 'denied') setNotificationStatus('denied');
    }
  };

  const handleAllowAllPermissions = async () => {
    setRequestingPerms(true);
    try {
      // 1. Geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setLocationStatus('granted'),
          () => setLocationStatus('denied')
        );
      }

      // 2. Camera & Microphone
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setCameraStatus('granted');
          setMicStatus('granted');
          stream.getTracks().forEach((track) => track.stop());
        } catch (err) {
          setCameraStatus('denied');
          setMicStatus('denied');
        }
      }

      // 3. Notifications
      if ('Notification' in window) {
        const res = await Notification.requestPermission();
        if (res === 'granted') setNotificationStatus('granted');
        else if (res === 'denied') setNotificationStatus('denied');
      }
    } catch (e) {
      console.warn('Error requesting permissions:', e);
    } finally {
      setRequestingPerms(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;

    setAddingContact(true);
    const newContactObj: TrustedContact = {
      id: 'contact-' + Date.now(),
      userId: user.uid,
      name: contactName.trim(),
      relationship: contactRelation,
      phone: contactPhone.trim(),
      email: contactEmail.trim(),
      isPrimary: isPrimary || contacts.length === 0,
      createdAt: new Date().toISOString()
    };

    let updatedList = [...contacts];
    if (isPrimary) {
      updatedList = updatedList.map((c) => ({ ...c, isPrimary: false }));
    }

    if (user.uid && !user.uid.startsWith('demo-')) {
      try {
        const docRef = await addDoc(collection(db, 'trusted_contacts'), {
          userId: user.uid,
          name: newContactObj.name,
          relationship: newContactObj.relationship,
          phone: newContactObj.phone,
          email: newContactObj.email,
          isPrimary: newContactObj.isPrimary,
          createdAt: newContactObj.createdAt
        });
        newContactObj.id = docRef.id;
      } catch (err) {
        console.warn('Error saving trusted contact to Firestore:', err);
      }
    }

    updatedList.push(newContactObj);
    onContactsChange(updatedList);

    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setAddingContact(false);
    setContactSuccessToast('Trusted contact added successfully!');
    setTimeout(() => setContactSuccessToast(null), 3000);
  };

  // Demo SOS simulation countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeDemo === 'sos' && !demoSosSent && demoSosSeconds > 0) {
      interval = setInterval(() => {
        setDemoSosSeconds((prev) => {
          if (prev <= 1) {
            setDemoSosSent(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeDemo, demoSosSent, demoSosSeconds]);

  // Demo Safe Walk timer simulation
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeDemo === 'safewalk' && !demoWalkCompleted && demoWalkSeconds > 0) {
      interval = setInterval(() => {
        setDemoWalkSeconds((prev) => {
          if (prev <= 1) {
            setDemoWalkCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeDemo, demoWalkCompleted, demoWalkSeconds]);

  // Demo Safety Check-in timer simulation
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeDemo === 'checkin' && !demoCheckInAnswered && demoCheckInSeconds > 0) {
      interval = setInterval(() => {
        setDemoCheckInSeconds((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeDemo, demoCheckInAnswered, demoCheckInSeconds]);

  const startSosDemo = () => {
    setActiveDemo('sos');
    setDemoSosSeconds(3);
    setDemoSosSent(false);
  };

  const startWalkDemo = () => {
    setActiveDemo('safewalk');
    setDemoWalkSeconds(5);
    setDemoWalkCompleted(false);
  };

  const startCheckInDemo = () => {
    setActiveDemo('checkin');
    setDemoCheckInSeconds(3);
    setDemoCheckInAnswered(false);
  };

  const startFakeCallDemo = () => {
    setActiveDemo('fakecall');
    setDemoFakeCallRinging(true);
    setDemoFakeCallInCall(false);
  };

  const totalSteps = 6;

  return (
    <div className="min-h-full bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 select-none relative overflow-y-auto">
      {/* Top Header & Progress Stepper */}
      <div className="pt-2 pb-4 border-b border-slate-900 sticky top-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center">
            <Shield className="w-4 h-4 text-violet-300" />
          </div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-wider text-white">
              VERA Companion {isReplay ? '• Guide' : '• Setup'}
            </h1>
            <p className="text-[10px] text-slate-400">Step {currentStep} of {totalSteps}</p>
          </div>
        </div>

        {/* Step Indicator Dots */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === currentStep
                  ? 'w-6 bg-violet-500'
                  : s < currentStep
                  ? 'w-2 bg-violet-800'
                  : 'w-2 bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area per Screen */}
      <div className="my-auto py-6 max-w-md w-full mx-auto space-y-6">
        {/* ==================== SCREEN 1: WELCOME ==================== */}
        {currentStep === 1 && (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-tr from-violet-600/30 via-indigo-600/20 to-slate-900 border border-violet-500/40 shadow-2xl mx-auto my-2">
              <div className="absolute inset-0 bg-violet-500/20 rounded-3xl blur-xl animate-pulse" />
              <Shield className="w-14 h-14 text-violet-300 relative z-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Welcome to VERA Companion
              </h2>
              <p className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                Your AI-powered personal safety companion.
              </p>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-3xl text-xs text-slate-300 leading-relaxed text-left shadow-xl space-y-3">
              <p>
                VERA helps you stay connected, stay prepared, and quickly get help when you need it most.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400">
                <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>24/7 AI Guardian</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                  <span>Instant SOS Alert</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button
                type="button"
                id="onboarding-step1-skip-btn"
                onClick={onSkipOnboarding}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs rounded-2xl border border-slate-800 transition"
              >
                Skip
              </button>
              <button
                type="button"
                id="onboarding-step1-next-btn"
                onClick={() => setCurrentStep(2)}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-violet-950/60 flex items-center justify-center gap-2 transition"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================== SCREEN 2: MEET SAFETY FEATURES ==================== */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-white">Meet Your Safety Features</h2>
              <p className="text-xs text-slate-400">Six essential tools designed to keep you protected at all times.</p>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {/* Feature 1 */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-start gap-3 shadow-md">
                <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 shrink-0">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Emergency SOS
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Instant distress alert that broadcasts your live location and alerts your trusted contacts.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-start gap-3 shadow-md">
                <div className="p-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 shrink-0">
                  <Footprints className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Safe Walk</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Monitors your route in real-time and notifies contacts if you don't reach your destination.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-start gap-3 shadow-md">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 shrink-0">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Safety Check-In</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Automated safety countdown that prompts you to confirm you are safe before escalating.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-start gap-3 shadow-md">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Fake Call</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Simulates a incoming telephone call to help you gracefully leave uncomfortable situations.
                  </p>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-start gap-3 shadow-md">
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Emergency Evidence</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Securely records audio and video evidence during emergency events for your protection.
                  </p>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-start gap-3 shadow-md">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">AI Emergency Reports</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Synthesizes incident data and evidence into clear structured summaries for responders.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                id="onboarding-step2-back-btn"
                onClick={() => setCurrentStep(1)}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-2xl border border-slate-800 transition flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                id="onboarding-step2-next-btn"
                onClick={() => setCurrentStep(3)}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-violet-950/60 flex items-center justify-center gap-2 transition"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================== SCREEN 3: PERMISSIONS ==================== */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-white">Permissions</h2>
              <p className="text-xs text-slate-400">
                Granting permissions allows VERA to locate you and record evidence during emergencies.
              </p>
            </div>

            <div className="space-y-3">
              {/* Location Permission */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Location</h3>
                    <p className="text-[11px] text-slate-400">Used to provide accurate emergency location.</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                  locationStatus === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : locationStatus === 'denied'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {locationStatus}
                </span>
              </div>

              {/* Notifications Permission */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Notifications</h3>
                    <p className="text-[11px] text-slate-400">Used for reminders and emergency alerts.</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                  notificationStatus === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : notificationStatus === 'denied'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {notificationStatus}
                </span>
              </div>

              {/* Camera Permission */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Camera</h3>
                    <p className="text-[11px] text-slate-400">Used for emergency video evidence.</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                  cameraStatus === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : cameraStatus === 'denied'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {cameraStatus}
                </span>
              </div>

              {/* Microphone Permission */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-red-500/20 text-red-400 shrink-0">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Microphone</h3>
                    <p className="text-[11px] text-slate-400">Used for emergency audio evidence.</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                  micStatus === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : micStatus === 'denied'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {micStatus}
                </span>
              </div>
            </div>

            <button
              type="button"
              id="onboarding-allow-permissions-btn"
              onClick={handleAllowAllPermissions}
              disabled={requestingPerms}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className={`w-4 h-4 ${requestingPerms ? 'animate-spin' : ''}`} />
              <span>{requestingPerms ? 'Requesting Permissions...' : 'Allow Permissions'}</span>
            </button>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                id="onboarding-step3-back-btn"
                onClick={() => setCurrentStep(2)}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-2xl border border-slate-800 transition flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                id="onboarding-step3-next-btn"
                onClick={() => setCurrentStep(4)}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-violet-950/60 flex items-center justify-center gap-2 transition"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================== SCREEN 4: ADD TRUSTED CONTACTS ==================== */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-white">Add Trusted Contacts</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Trusted contacts receive emergency notifications, your AI Emergency Report, and your live location during an emergency.
              </p>
            </div>

            {contactSuccessToast && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{contactSuccessToast}</span>
              </div>
            )}

            {/* Existing contacts preview */}
            {contacts.length > 0 && (
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-[10px] font-black uppercase text-violet-400 tracking-wider">
                  Configured Contacts ({contacts.length})
                </span>
                <div className="space-y-1.5">
                  {contacts.map((c) => (
                    <div key={c.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{c.name}</h4>
                          <p className="text-[10px] text-slate-400 truncate">{c.relationship} • {c.phone}</p>
                        </div>
                      </div>
                      {c.isPrimary && (
                        <span className="text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Add Contact Form */}
            <form onSubmit={handleAddContact} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-lg">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-violet-400" />
                <span>Add First Trusted Contact</span>
              </h3>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  id="onboarding-contact-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Sarah Miller"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Relationship</label>
                  <select
                    value={contactRelation}
                    onChange={(e) => setContactRelation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Parent">Parent</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Sister">Sister</option>
                    <option value="Brother">Brother</option>
                    <option value="Close Friend">Close Friend</option>
                    <option value="Colleague">Colleague</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    id="onboarding-contact-phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 (555) 019-2831"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  id="onboarding-contact-email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="sarah@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <button
                type="submit"
                disabled={addingContact}
                id="onboarding-add-contact-btn"
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{addingContact ? 'Adding...' : 'Add Contact'}</span>
              </button>
            </form>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                id="onboarding-step4-back-btn"
                onClick={() => setCurrentStep(3)}
                className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-2xl border border-slate-800 transition flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                id="onboarding-step4-skip-btn"
                onClick={() => setCurrentStep(5)}
                className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-xs rounded-2xl border border-slate-800 transition"
              >
                Skip
              </button>
              <button
                type="button"
                id="onboarding-step4-next-btn"
                onClick={() => setCurrentStep(5)}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-violet-950/60 flex items-center justify-center gap-2 transition"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================== SCREEN 5: TEST VERA ==================== */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-white">Test VERA</h2>
              <p className="text-xs text-slate-300">
                Safely try out Demo Mode to see how each safety feature works in action.
              </p>
            </div>

            {/* Sandbox guarantee banner */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[11px] text-amber-200/90 flex items-center gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Demo Mode Sandbox:</strong> Will never send notifications, contact trusted contacts, or create a real emergency report.
              </span>
            </div>

            {/* Interactive Demo Cards */}
            <div className="space-y-3">
              {/* Demo SOS */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-red-400" />
                    <h3 className="text-xs font-bold text-white">Emergency SOS Demo</h3>
                  </div>
                  <button
                    type="button"
                    id="demo-test-sos-btn"
                    onClick={startSosDemo}
                    className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-[11px] font-bold rounded-xl border border-red-500/30 transition flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>Test SOS</span>
                  </button>
                </div>

                {activeDemo === 'sos' && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-red-500/30 space-y-2 animate-in fade-in">
                    {!demoSosSent ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-red-400 font-bold animate-pulse">
                          Simulating SOS dispatch in {demoSosSeconds}s...
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveDemo('none')}
                          className="text-[10px] font-bold text-slate-400 hover:text-white underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-center py-1">
                        <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Demo SOS Broadcast Complete
                        </span>
                        <p className="text-[10px] text-slate-400">Live GPS signal & AI report prepared in Sandbox.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Demo Safe Walk */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Footprints className="w-4 h-4 text-violet-400" />
                    <h3 className="text-xs font-bold text-white">Safe Walk Demo</h3>
                  </div>
                  <button
                    type="button"
                    id="demo-test-walk-btn"
                    onClick={startWalkDemo}
                    className="px-3 py-1 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-[11px] font-bold rounded-xl border border-violet-500/30 transition flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>Test Walk</span>
                  </button>
                </div>

                {activeDemo === 'safewalk' && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-violet-500/30 space-y-2 animate-in fade-in">
                    {!demoWalkCompleted ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">Walking to "Library"</span>
                          <span className="font-mono text-violet-400 font-bold">{demoWalkSeconds}s remaining</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-500 transition-all duration-1000"
                            style={{ width: `${((5 - demoWalkSeconds) / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-1 text-xs text-emerald-400 font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Destination Reached Safely!
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Demo Safety Check-In */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold text-white">Safety Check-In Demo</h3>
                  </div>
                  <button
                    type="button"
                    id="demo-test-checkin-btn"
                    onClick={startCheckInDemo}
                    className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[11px] font-bold rounded-xl border border-indigo-500/30 transition flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>Test Timer</span>
                  </button>
                </div>

                {activeDemo === 'checkin' && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-2 animate-in fade-in">
                    {!demoCheckInAnswered ? (
                      <div className="space-y-2 text-center">
                        <p className="text-xs text-amber-300 font-bold">Are you safe? Check in now:</p>
                        <button
                          type="button"
                          onClick={() => setDemoCheckInAnswered(true)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition"
                        >
                          I'm Safe!
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-1 text-xs text-emerald-400 font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Check-In Confirmed Safe
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Demo Fake Call */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-white">Fake Call Demo</h3>
                  </div>
                  <button
                    type="button"
                    id="demo-test-fakecall-btn"
                    onClick={startFakeCallDemo}
                    className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-bold rounded-xl border border-emerald-500/30 transition flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>Test Call</span>
                  </button>
                </div>

                {activeDemo === 'fakecall' && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-2 animate-in fade-in">
                    {demoFakeCallRinging && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5 animate-pulse">
                          <PhoneCall className="w-4 h-4 text-emerald-400" /> Incoming Call from Mom...
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDemoFakeCallRinging(false);
                              setDemoFakeCallInCall(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg"
                          >
                            Answer
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveDemo('none')}
                            className="px-2.5 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )}

                    {demoFakeCallInCall && (
                      <div className="space-y-1.5 text-center">
                        <span className="text-xs font-bold text-emerald-400">Call Connected (Simulated Voice)</span>
                        <button
                          type="button"
                          onClick={() => setActiveDemo('none')}
                          className="w-full py-1.5 bg-red-600/30 text-red-300 text-xs font-bold rounded-xl border border-red-500/30"
                        >
                          End Call
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                id="onboarding-step5-back-btn"
                onClick={() => setCurrentStep(4)}
                className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-2xl border border-slate-800 transition flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                id="onboarding-step5-skip-btn"
                onClick={() => setCurrentStep(6)}
                className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-xs rounded-2xl border border-slate-800 transition"
              >
                Skip
              </button>
              <button
                type="button"
                id="onboarding-step5-next-btn"
                onClick={() => setCurrentStep(6)}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-violet-950/60 flex items-center justify-center gap-2 transition"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================== SCREEN 6: YOU'RE READY ==================== */}
        {currentStep === 6 && (
          <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300 py-4">
            {/* Success Illustration Graphic */}
            <div className="relative inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-tr from-emerald-600/30 via-violet-600/20 to-slate-900 border-2 border-emerald-500/50 shadow-2xl mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl animate-pulse" />
              <ShieldCheck className="w-16 h-16 text-emerald-400 relative z-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                You're Protected
              </h2>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                VERA Companion is now ready to help keep you safe.
              </p>
            </div>

            {/* Checklist of readiness */}
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-3xl text-left space-y-2.5 shadow-xl">
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>AI Safety Guardian Active</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Emergency SOS Shortcut Configured</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Trusted Contacts Link Ready</span>
              </div>
            </div>

            <button
              type="button"
              id="onboarding-goto-dashboard-btn"
              onClick={onCompleteOnboarding}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-violet-600 hover:from-emerald-500 hover:to-violet-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
