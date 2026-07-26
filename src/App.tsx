import React, { useState, useEffect } from 'react';
import { 
  auth, 
  onAuthStateChanged, 
  signOut, 
  db, 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc 
} from './lib/firebase';
import { UserProfile, TrustedContact, AISummaryReport, ScreenType } from './types';
import { WelcomeScreen } from './components/WelcomeScreen';
import { HomeScreen } from './components/HomeScreen';
import { EmergencyScreen } from './components/EmergencyScreen';
import { TrustedContactsScreen } from './components/TrustedContactsScreen';
import { AISummaryScreen } from './components/AISummaryScreen';
import { SafetyCheckInScreen } from './components/SafetyCheckInScreen';
import { SafeWalkScreen } from './components/SafeWalkScreen';
import { FakeCallScreen } from './components/FakeCallScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { Navbar } from './components/Navbar';
import { Shield } from 'lucide-react';
import { addDoc, updateDoc } from './lib/firebase';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('welcome');
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [latestSummary, setLatestSummary] = useState<AISummaryReport | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Safety Check-In global state
  const [activeCheckIn, setActiveCheckIn] = useState<{
    docId: string | null;
    startTime: string | null;
    selectedDurationLabel: string;
    totalSeconds: number;
    remainingSeconds: number;
    note: string;
    isActive: boolean;
    isPromptShowing: boolean;
  } | null>(null);

  // Emergency trigger override options (for expired check-ins)
  const [autoEmergencyConfig, setAutoEmergencyConfig] = useState<{
    autoStartSOS: boolean;
    triggerSource?: string;
    checkInNote?: string;
  }>({ autoStartSOS: false });

  // Safety Check-In 1-second countdown timer loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeCheckIn?.isActive && !activeCheckIn?.isPromptShowing) {
      interval = setInterval(() => {
        setActiveCheckIn((prev) => {
          if (!prev || !prev.isActive || prev.isPromptShowing) return prev;
          if (prev.remainingSeconds <= 1) {
            return {
              ...prev,
              remainingSeconds: 0,
              isPromptShowing: true
            };
          }
          return {
            ...prev,
            remainingSeconds: prev.remainingSeconds - 1
          };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCheckIn?.isActive, activeCheckIn?.isPromptShowing]);

  // Handlers for Safety Check-In Firestore & Local State
  const handleStartCheckIn = async (durationLabel: string, seconds: number, note: string) => {
    const startTimeIso = new Date().toISOString();
    let docId: string | null = null;

    if (user && user.uid && !user.uid.startsWith('demo-')) {
      try {
        const docRef = await addDoc(collection(db, 'safety_checkins'), {
          userId: user.uid,
          startTime: startTimeIso,
          selectedDuration: durationLabel,
          optionalNote: note,
          status: 'active',
          completedTime: null
        });
        docId = docRef.id;
      } catch (e) {
        console.warn('Error saving safety check-in to Firestore:', e);
      }
    }

    setActiveCheckIn({
      docId,
      startTime: startTimeIso,
      selectedDurationLabel: durationLabel,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      note,
      isActive: true,
      isPromptShowing: false
    });
  };

  const handleCancelCheckIn = async () => {
    if (activeCheckIn?.docId && user && !user.uid.startsWith('demo-')) {
      try {
        await updateDoc(doc(db, 'safety_checkins', activeCheckIn.docId), {
          status: 'safe',
          completedTime: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Error updating safety check-in status:', e);
      }
    }
    setActiveCheckIn(null);
  };

  const handleRespondSafe = async () => {
    if (activeCheckIn?.docId && user && !user.uid.startsWith('demo-')) {
      try {
        await updateDoc(doc(db, 'safety_checkins', activeCheckIn.docId), {
          status: 'safe',
          completedTime: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Error updating safety check-in status:', e);
      }
    }
    setActiveCheckIn(null);
  };

  const handleExtendCheckIn = async () => {
    if (activeCheckIn?.docId && user && !user.uid.startsWith('demo-')) {
      try {
        await updateDoc(doc(db, 'safety_checkins', activeCheckIn.docId), {
          status: 'extended'
        });
      } catch (e) {
        console.warn('Error extending safety check-in status:', e);
      }
    }
    setActiveCheckIn((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        remainingSeconds: prev.remainingSeconds + 900,
        isPromptShowing: false
      };
    });
  };

  const handleTriggerEmergencyFromCheckIn = async (checkInNote?: string) => {
    if (activeCheckIn?.docId && user && !user.uid.startsWith('demo-')) {
      try {
        await updateDoc(doc(db, 'safety_checkins', activeCheckIn.docId), {
          status: 'expired',
          completedTime: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Error updating expired safety check-in in Firestore:', e);
      }
    }
    const noteToUse = checkInNote || activeCheckIn?.note || '';
    setActiveCheckIn(null);
    setAutoEmergencyConfig({
      autoStartSOS: true,
      triggerSource: 'SAFETY_CHECKIN_EXPIRED',
      checkInNote: noteToUse
    });
    setCurrentScreen('emergency');
  };

  // Safe Walk global state
  const [activeSafeWalk, setActiveSafeWalk] = useState<{
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
  } | null>(null);

  // Safe Walk 1-second interval loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeSafeWalk?.isActive && !activeSafeWalk?.isPromptShowing) {
      interval = setInterval(() => {
        setActiveSafeWalk((prev) => {
          if (!prev || !prev.isActive || prev.isPromptShowing) return prev;
          if (prev.remainingSeconds <= 1) {
            return {
              ...prev,
              remainingSeconds: 0,
              elapsedSeconds: prev.elapsedSeconds + 1,
              isPromptShowing: true
            };
          }
          return {
            ...prev,
            remainingSeconds: prev.remainingSeconds - 1,
            elapsedSeconds: prev.elapsedSeconds + 1
          };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSafeWalk?.isActive, activeSafeWalk?.isPromptShowing]);

  // Handlers for Safe Walk Firestore & Local State
  const handleStartSafeWalk = async (
    destination: string,
    transportMode: 'walking' | 'driving',
    durationLabel: string,
    seconds: number,
    note: string
  ) => {
    const startTimeIso = new Date().toISOString();
    let docId: string | null = null;

    if (user && user.uid && !user.uid.startsWith('demo-')) {
      try {
        const docRef = await addDoc(collection(db, 'safe_walk_sessions'), {
          userId: user.uid,
          destination,
          transportMode,
          expectedDuration: durationLabel,
          startTime: startTimeIso,
          optionalNote: note,
          status: 'active',
          completedTime: null
        });
        docId = docRef.id;
      } catch (e) {
        console.warn('Error saving safe walk session to Firestore:', e);
      }
    }

    setActiveSafeWalk({
      docId,
      destination,
      transportMode,
      startTime: startTimeIso,
      expectedDurationLabel: durationLabel,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      elapsedSeconds: 0,
      note,
      isActive: true,
      isPromptShowing: false
    });
  };

  const handleEndSafeWalk = async () => {
    if (activeSafeWalk?.docId && user && !user.uid.startsWith('demo-')) {
      try {
        await updateDoc(doc(db, 'safe_walk_sessions', activeSafeWalk.docId), {
          status: 'completed',
          completedTime: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Error updating safe walk status:', e);
      }
    }
    setActiveSafeWalk(null);
  };

  const handleRespondSafeWalkSafe = async () => {
    if (activeSafeWalk?.docId && user && !user.uid.startsWith('demo-')) {
      try {
        await updateDoc(doc(db, 'safe_walk_sessions', activeSafeWalk.docId), {
          status: 'completed',
          completedTime: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Error updating safe walk status:', e);
      }
    }
    setActiveSafeWalk(null);
  };

  const handleExtendSafeWalk = async () => {
    if (activeSafeWalk?.docId && user && !user.uid.startsWith('demo-')) {
      try {
        await updateDoc(doc(db, 'safe_walk_sessions', activeSafeWalk.docId), {
          status: 'extended'
        });
      } catch (e) {
        console.warn('Error extending safe walk status:', e);
      }
    }
    setActiveSafeWalk((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        remainingSeconds: prev.remainingSeconds + 900,
        isPromptShowing: false
      };
    });
  };

  const handleTriggerEmergencyFromSafeWalk = async (checkInNote?: string) => {
    if (activeSafeWalk?.docId && user && !user.uid.startsWith('demo-')) {
      try {
        await updateDoc(doc(db, 'safe_walk_sessions', activeSafeWalk.docId), {
          status: 'expired',
          completedTime: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Error updating expired safe walk in Firestore:', e);
      }
    }
    const noteToUse = checkInNote || (activeSafeWalk ? `Safe Walk to "${activeSafeWalk.destination}". ${activeSafeWalk.note}` : '');
    setActiveSafeWalk(null);
    setAutoEmergencyConfig({
      autoStartSOS: true,
      triggerSource: 'SAFE_WALK_EXPIRED',
      checkInNote: noteToUse
    });
    setCurrentScreen('emergency');
  };

  // Fake Call Global State
  const [activeScheduledFakeCall, setActiveScheduledFakeCall] = useState<{
    callerName: string;
    delaySeconds: number;
    remainingSeconds: number;
    ringtone: string;
    voiceMessage: string;
    isRinging: boolean;
    isInCall: boolean;
  } | null>(null);

  // Fake Call countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeScheduledFakeCall && !activeScheduledFakeCall.isRinging && !activeScheduledFakeCall.isInCall) {
      interval = setInterval(() => {
        setActiveScheduledFakeCall((prev) => {
          if (!prev || prev.isRinging || prev.isInCall) return prev;
          if (prev.remainingSeconds <= 1) {
            return {
              ...prev,
              remainingSeconds: 0,
              isRinging: true
            };
          }
          return {
            ...prev,
            remainingSeconds: prev.remainingSeconds - 1
          };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeScheduledFakeCall?.isRinging, activeScheduledFakeCall?.isInCall, activeScheduledFakeCall]);

  const handleScheduleFakeCall = (
    callerName: string,
    delaySeconds: number,
    ringtone: string,
    voiceMessage: string
  ) => {
    setActiveScheduledFakeCall({
      callerName,
      delaySeconds,
      remainingSeconds: delaySeconds,
      ringtone,
      voiceMessage,
      isRinging: false,
      isInCall: false
    });
  };

  const handleCancelScheduledFakeCall = () => {
    setActiveScheduledFakeCall(null);
  };

  const handleTriggerFakeCallNow = () => {
    setActiveScheduledFakeCall((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        remainingSeconds: 0,
        isRinging: true
      };
    });
  };

  const handleAnswerFakeCall = () => {
    setActiveScheduledFakeCall((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        isRinging: false,
        isInCall: true
      };
    });
  };

  const handleDeclineFakeCall = () => {
    setActiveScheduledFakeCall(null);
  };

  const handleEndFakeCall = () => {
    setActiveScheduledFakeCall(null);
  };

  // Initialize initial default mock/fallback contacts for smooth experience
  const defaultContacts: TrustedContact[] = [
    {
      id: 'default-1',
      userId: 'demo-user',
      name: 'Sarah Miller',
      relationship: 'Sister',
      phone: '+1 (555) 019-2831',
      email: 'sarah.m@example.com',
      isPrimary: true
    },
    {
      id: 'default-2',
      userId: 'demo-user',
      name: 'Marcus Chen',
      relationship: 'Close Friend',
      phone: '+1 (555) 018-9201',
      email: 'marcus@example.com',
      isPrimary: false
    }
  ];

  // Fetch trusted contacts from Firestore
  const fetchUserContacts = async (uid: string) => {
    if (uid.startsWith('demo-')) {
      setContacts(defaultContacts);
      return;
    }

    try {
      let q = query(collection(db, 'trusted_contacts'), where('userId', '==', uid));
      let querySnap = await getDocs(q);
      
      if (querySnap.empty) {
        q = query(collection(db, 'trustedContacts'), where('userId', '==', uid));
        querySnap = await getDocs(q);
      }

      const list: TrustedContact[] = [];
      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          userId: data.userId,
          name: data.name,
          relationship: data.relationship,
          phone: data.phone,
          email: data.email,
          isPrimary: data.isPrimary
        });
      });

      if (list.length > 0) {
        setContacts(list);
      } else {
        setContacts(defaultContacts);
      }
    } catch (err) {
      console.warn('Error fetching contacts from Firestore:', err);
      setContacts(defaultContacts);
    }
  };

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userRef);
          let userProfile: UserProfile;

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            userProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || 'user@veracompanion.io',
              displayName: data.displayName || firebaseUser.displayName || 'VERA User',
              phoneNumber: data.phoneNumber || '',
              emergencyMedicalNotes: data.emergencyMedicalNotes || 'Asthma inhaler in bag.',
              safetyStatus: data.safetyStatus || 'safe',
              hasCompletedOnboarding: data.hasCompletedOnboarding ?? false,
              lastLocation: data.lastLocation || {
                address: 'Downtown Seattle, WA',
                lat: 47.6062,
                lng: -122.3321,
                updatedAt: new Date().toISOString()
              }
            };
          } else {
            userProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || 'user@veracompanion.io',
              displayName: firebaseUser.displayName || 'VERA User',
              emergencyMedicalNotes: 'Asthma inhaler in bag.',
              safetyStatus: 'safe',
              hasCompletedOnboarding: false,
              lastLocation: {
                address: 'Downtown Seattle, WA',
                lat: 47.6062,
                lng: -122.3321,
                updatedAt: new Date().toISOString()
              }
            };
          }

          setUser(userProfile);
          await fetchUserContacts(firebaseUser.uid);

          if (userProfile.hasCompletedOnboarding) {
            setCurrentScreen('home');
          } else {
            setCurrentScreen('onboarding');
          }
        } catch (err) {
          console.warn('Error syncing auth user profile:', err);
        }
      } else {
        if (!user || !user.uid.startsWith('demo-')) {
          setUser(null);
          setCurrentScreen('welcome');
        }
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    fetchUserContacts(profile.uid);
    if (profile.hasCompletedOnboarding) {
      setCurrentScreen('home');
    } else {
      setCurrentScreen('onboarding');
    }
  };

  const handleFinishOnboarding = async () => {
    if (user) {
      const updated = { ...user, hasCompletedOnboarding: true };
      setUser(updated);
      if (!user.uid.startsWith('demo-')) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            hasCompletedOnboarding: true
          });
        } catch (err) {
          console.warn('Error saving onboarding completion in Firestore:', err);
        }
      }
    }
    setCurrentScreen('home');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    setUser(null);
    setLatestSummary(null);
    setCurrentScreen('welcome');
  };

  const handleUpdateUser = (updated: Partial<UserProfile>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  const handleEmergencyTriggered = (summary: AISummaryReport) => {
    setLatestSummary(summary);
    setCurrentScreen('ai_summary');
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-3xl bg-violet-600/30 border border-violet-500/50 flex items-center justify-center mb-4 animate-pulse">
          <Shield className="w-8 h-8 text-violet-400" />
        </div>
        <h2 className="text-xl font-bold text-white">VERA Companion</h2>
        <p className="text-xs text-violet-300 mt-1">Initializing AI Safety Guard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center sm:p-4 font-sans selection:bg-violet-500 selection:text-white">
      {/* Mobile Device Viewport Shell Container */}
      <div className="w-full sm:max-w-md h-screen sm:h-[840px] bg-slate-950 sm:rounded-[2.5rem] sm:border-[8px] sm:border-slate-800 sm:shadow-2xl overflow-hidden relative flex flex-col">
        {/* Top Status Bar Decoration for Desktop Container */}
        <div className="hidden sm:flex justify-between items-center px-6 py-2 bg-slate-950 text-[10px] text-slate-500 border-b border-slate-900 select-none z-30">
          <span className="font-bold text-violet-400">VERA Companion v1.0</span>
          <div className="w-12 h-3 bg-slate-900 rounded-full" />
          <span>GPS Active • 100%</span>
        </div>

        {/* Dynamic Screen Renderer */}
        <main className="flex-1 overflow-y-auto relative">
          {currentScreen === 'welcome' && (
            <WelcomeScreen onSuccess={handleLoginSuccess} />
          )}

          {currentScreen === 'onboarding' && user && (
            <OnboardingScreen
              user={user}
              contacts={contacts}
              onContactsChange={setContacts}
              onCompleteOnboarding={handleFinishOnboarding}
              onSkipOnboarding={handleFinishOnboarding}
            />
          )}

          {currentScreen === 'home' && user && (
            <HomeScreen
              user={user}
              contacts={contacts}
              onNavigate={(s) => {
                if (s === 'emergency') {
                  setAutoEmergencyConfig({ autoStartSOS: false });
                }
                setCurrentScreen(s);
              }}
              onUpdateUser={handleUpdateUser}
              onLogout={handleLogout}
              activeCheckInSummary={
                activeCheckIn?.isActive
                  ? {
                      isActive: true,
                      remainingText: `${Math.floor(activeCheckIn.remainingSeconds / 60)}m remaining`
                    }
                  : undefined
              }
              activeSafeWalkSummary={
                activeSafeWalk?.isActive
                  ? {
                      isActive: true,
                      destination: activeSafeWalk.destination,
                      remainingText: `${Math.floor(activeSafeWalk.remainingSeconds / 60)}m to ${activeSafeWalk.destination}`
                    }
                  : undefined
              }
              activeFakeCallSummary={
                activeScheduledFakeCall
                  ? {
                      isScheduled: true,
                      callerName: activeScheduledFakeCall.callerName,
                      remainingText: activeScheduledFakeCall.isRinging
                        ? 'Ringing...'
                        : activeScheduledFakeCall.isInCall
                        ? 'In Call'
                        : `${activeScheduledFakeCall.remainingSeconds}s (${activeScheduledFakeCall.callerName})`
                    }
                  : undefined
              }
            />
          )}

          {/* Fake Call Screen or Overlay */}
          {(currentScreen === 'fake_call' || activeScheduledFakeCall?.isRinging || activeScheduledFakeCall?.isInCall) && user && (
            <FakeCallScreen
              user={user}
              onBack={() => setCurrentScreen('home')}
              activeScheduledCall={activeScheduledFakeCall}
              onScheduleCall={handleScheduleFakeCall}
              onCancelScheduledCall={handleCancelScheduledFakeCall}
              onTriggerCallNow={handleTriggerFakeCallNow}
              onAnswerCall={handleAnswerFakeCall}
              onDeclineCall={handleDeclineFakeCall}
              onEndCall={handleEndFakeCall}
            />
          )}

          {currentScreen === 'emergency' && user && (
            <EmergencyScreen
              user={user}
              contacts={contacts}
              onBack={() => {
                setAutoEmergencyConfig({ autoStartSOS: false });
                setCurrentScreen('home');
              }}
              onEmergencyTriggered={handleEmergencyTriggered}
              autoStartSOS={autoEmergencyConfig.autoStartSOS}
              triggerSource={autoEmergencyConfig.triggerSource}
              checkInNote={autoEmergencyConfig.checkInNote}
            />
          )}

          {currentScreen === 'safe_walk' && user && (
            <SafeWalkScreen
              user={user}
              onBack={() => setCurrentScreen('home')}
              onTriggerEmergency={handleTriggerEmergencyFromSafeWalk}
              activeTrip={activeSafeWalk}
              onStartTrip={handleStartSafeWalk}
              onEndTrip={handleEndSafeWalk}
              onRespondSafe={handleRespondSafeWalkSafe}
              onExtendTrip={handleExtendSafeWalk}
            />
          )}

          {currentScreen === 'safety_checkin' && user && (
            <SafetyCheckInScreen
              user={user}
              onBack={() => setCurrentScreen('home')}
              onTriggerEmergency={handleTriggerEmergencyFromCheckIn}
              activeCheckIn={activeCheckIn}
              onStartCheckIn={handleStartCheckIn}
              onCancelCheckIn={handleCancelCheckIn}
              onRespondSafe={handleRespondSafe}
              onExtendCheckIn={handleExtendCheckIn}
            />
          )}

          {currentScreen === 'contacts' && user && (
            <TrustedContactsScreen
              userId={user.uid}
              contacts={contacts}
              onContactsChange={setContacts}
              onBack={() => setCurrentScreen('home')}
            />
          )}

          {currentScreen === 'ai_summary' && latestSummary && (
            <AISummaryScreen
              summary={latestSummary}
              onReturnHome={() => setCurrentScreen('home')}
            />
          )}

          {currentScreen === 'settings' && user && (
            <SettingsScreen
              user={user}
              contacts={contacts}
              onContactsChange={setContacts}
              onUpdateUser={handleUpdateUser}
              onLogout={handleLogout}
              onBack={() => setCurrentScreen('home')}
              onReplayOnboarding={() => setCurrentScreen('onboarding')}
            />
          )}

          {currentScreen === 'history' && user && (
            <HistoryScreen
              latestSummary={latestSummary}
              onNavigate={setCurrentScreen}
              onBack={() => setCurrentScreen('home')}
            />
          )}
        </main>

        {/* Navigation Bar */}
        {user && (
          <Navbar
            currentScreen={currentScreen}
            onNavigate={setCurrentScreen}
            hasSummary={latestSummary !== null}
            contactsCount={contacts.length}
          />
        )}
      </div>
    </div>
  );
}
