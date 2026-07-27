import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  db,
  doc,
  setDoc,
  getDoc
} from '../lib/firebase';
import { UserProfile } from '../types';

interface WelcomeScreenProps {
  onSuccess: (profile: UserProfile) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Logging in...');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveOrCreateUserProfile = async (uid: string, userEmail: string, name?: string): Promise<UserProfile> => {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        return {
          uid,
          email: data.email || userEmail,
          displayName: data.displayName || name || 'VERA User',
          phoneNumber: data.phoneNumber || '',
          emergencyMedicalNotes: data.emergencyMedicalNotes || '',
          safetyStatus: data.safetyStatus || 'safe',
          lastLocation: data.lastLocation || {
            address: 'Downtown Seattle, WA',
            lat: 47.6062,
            lng: -122.3321,
            updatedAt: new Date().toISOString()
          }
        };
      } else {
        const newProfile: UserProfile = {
          uid,
          email: userEmail,
          displayName: name || displayName || 'VERA User',
          phoneNumber: '+1 (555) 019-2831',
          emergencyMedicalNotes: medicalNotes || 'No allergies or critical conditions reported.',
          safetyStatus: 'safe',
          lastLocation: {
            address: 'Downtown Seattle, WA',
            lat: 47.6062,
            lng: -122.3321,
            updatedAt: new Date().toISOString()
          }
        };
        await setDoc(userRef, {
          ...newProfile,
          createdAt: new Date().toISOString()
        });
        return newProfile;
      }
    } catch (err) {
      console.warn('Firestore user fetch failed, returning dynamic user profile:', err);
      return {
        uid,
        email: userEmail,
        displayName: name || displayName || 'VERA User',
        emergencyMedicalNotes: medicalNotes || 'No known allergies',
        safetyStatus: 'safe',
        lastLocation: {
          address: 'Downtown Seattle, WA',
          lat: 47.6062,
          lng: -122.3321,
          updatedAt: new Date().toISOString()
        }
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage(isSignUp ? 'Creating account...' : 'Logging in...');
    setError(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        if (!email || !password) {
          throw new Error('Please provide email and password.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const profile = await saveOrCreateUserProfile(userCred.user.uid, userCred.user.email || email, displayName);
        setSuccessMessage('✓ Account Created');
        setTimeout(() => onSuccess(profile), 400);
      } else {
        if (!email || !password) {
          throw new Error('Please provide email and password.');
        }
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const profile = await saveOrCreateUserProfile(userCred.user.uid, userCred.user.email || email);
        setSuccessMessage('✓ Logged In Successfully');
        setTimeout(() => onSuccess(profile), 400);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const errCode = err.code || '';
      const errMsg = err.message || '';

      if (errCode === 'auth/weak-password' || errMsg.includes('weak-password')) {
        setError('Password must be at least 6 characters long. Please choose a stronger password to protect your account.');
      } else if (errCode === 'auth/email-already-in-use' || errMsg.includes('email-already-in-use')) {
        setError('An account with this email address already exists. We’ve switched to Sign In mode so you can log in.');
        setIsSignUp(false);
      } else if (errCode === 'auth/invalid-email' || errMsg.includes('invalid-email')) {
        setError('Please enter a valid email address (e.g., name@example.com).');
      } else if (
        errCode === 'auth/wrong-password' || 
        errCode === 'auth/user-not-found' || 
        errCode === 'auth/invalid-credential' ||
        errMsg.includes('user-not-found') ||
        errMsg.includes('wrong-password') ||
        errMsg.includes('invalid-credential')
      ) {
        if (!isSignUp) {
          setError('Incorrect email or password. Please double-check your credentials, or switch to "Create an account" below.');
        } else {
          setError('We couldn’t create your account with those details. Please check your information or try Demo Mode.');
        }
      } else if (errCode === 'auth/network-request-failed' || errMsg.includes('network')) {
        setError('Connection lost. Please check your internet connection and try again.');
      } else {
        setError('We couldn’t complete your sign in. Please check your details or try instant Demo Mode below.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    setLoadingMessage('Logging in...');
    setError(null);
    setSuccessMessage(null);
    try {
      let uid = 'demo-user-' + Date.now();
      let email = 'sarah.m@veracompanion.io';
      try {
        const userCred = await signInAnonymously(auth);
        uid = userCred.user.uid;
      } catch (e) {
        console.warn('Anonymous firebase auth fallback activated');
      }

      const demoProfile: UserProfile = {
        uid,
        email,
        displayName: 'Sarah Miller',
        phoneNumber: '+1 (555) 234-5678',
        emergencyMedicalNotes: 'Asthma inhaler required. Blood type O+',
        safetyStatus: 'safe',
        lastLocation: {
          address: '5th Ave & Pine St, Seattle, WA',
          lat: 47.6101,
          lng: -122.3370,
          updatedAt: new Date().toISOString()
        }
      };
      
      // Save to firestore if online
      try {
        await setDoc(doc(db, 'users', uid), demoProfile, { merge: true });
      } catch (err) {
        // ignore offline store write
      }

      setSuccessMessage('✓ Logged In Successfully');
      setTimeout(() => onSuccess(demoProfile), 400);
    } catch (err: any) {
      setError('We couldn’t launch demo mode right now. Please check your connection or refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setLoadingMessage('Logging in...');
    setError(null);
    setSuccessMessage(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const profile = await saveOrCreateUserProfile(
        result.user.uid, 
        result.user.email || 'google.user@vera.ai',
        result.user.displayName || 'Google User'
      );
      setSuccessMessage('✓ Logged In Successfully');
      setTimeout(() => onSuccess(profile), 400);
    } catch (err: any) {
      console.warn('Google sign-in popup error, falling back to instant preview:', err);
      // Fall back to instant guest session if popup blocked in iframe
      handleDemoSignIn();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-900 text-white flex flex-col justify-between p-6 sm:p-8">
      {/* Brand Header */}
      <div className="pt-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl mb-4 relative group">
          <div className="absolute inset-0 bg-violet-500/20 rounded-3xl blur-md group-hover:blur-lg transition-all" />
          <Shield className="w-10 h-10 text-violet-300 relative z-10" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">
          VERA <span className="font-light text-violet-300">Companion</span>
        </h1>
        <p className="text-violet-200/80 text-xs sm:text-sm mt-1 max-w-xs mx-auto font-medium">
          Your AI-Powered Personal Safety Guardian
        </p>
      </div>

      {/* Main Card */}
      <div className="my-auto py-6 max-w-md w-full mx-auto">
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl">
          {/* Toggle Tabs */}
          <div className="flex bg-slate-950/40 p-1 rounded-2xl mb-6 border border-white/10">
            <button
              type="button"
              id="welcome-create-account-tab"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                isSignUp 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' 
                  : 'text-violet-200/70 hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              id="welcome-sign-in-tab"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                !isSignUp 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' 
                  : 'text-violet-200/70 hover:text-white'
              }`}
            >
              Sign In
            </button>
          </div>

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-violet-200 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-violet-300 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    id="welcome-fullname-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Sarah Miller"
                    className="w-full bg-slate-950/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-violet-300/40 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-violet-300 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  id="welcome-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-violet-300/40 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1">
                Password {isSignUp && <span className="text-[10px] text-violet-300/80 font-normal">(Min. 6 characters)</span>}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-violet-300 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  id="welcome-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-violet-300/40 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-violet-200 mb-1">Emergency Medical Notes (Optional)</label>
                <textarea
                  rows={2}
                  id="welcome-medical-notes-input"
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="e.g., Blood Type A+, Asthma inhaler in bag"
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl py-2 text-xs sm:text-sm px-3 text-white placeholder-violet-300/40 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition resize-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              id="welcome-submit-btn"
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-bold rounded-xl text-xs sm:text-sm shadow-xl shadow-violet-950/50 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{loadingMessage}</span>
                </div>
              ) : (
                <>
                  <span>{isSignUp ? 'Create VERA Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative px-3 text-[10px] uppercase font-bold text-violet-300/60 bg-slate-900/60 rounded-full">
              or quick access
            </span>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              id="welcome-demo-login-btn"
              onClick={handleDemoSignIn}
              disabled={loading}
              className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-white/20 transition"
            >
              <Sparkles className="w-4 h-4 text-violet-300" />
              <span>Explore Preview Demo Mode</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Features */}
      <div className="text-center text-[11px] text-violet-200/60 flex justify-center gap-6 pt-2">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Firebase Secured
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" /> Gemini AI Engine
        </span>
      </div>
    </div>
  );
};
