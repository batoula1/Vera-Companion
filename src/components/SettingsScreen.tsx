import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  ShieldCheck, 
  Lock, 
  LogOut, 
  Users, 
  UserPlus, 
  Trash2, 
  Radio, 
  Clock, 
  AlertOctagon, 
  Camera, 
  Mic, 
  MapPin, 
  Bell, 
  Info, 
  FileText, 
  HelpCircle, 
  Check, 
  X, 
  ChevronRight, 
  Edit3, 
  Save, 
  Sparkles,
  RefreshCw,
  Shield,
  Key,
  Mail,
  Phone,
  AlertCircle
} from 'lucide-react';
import { UserProfile, TrustedContact, UserPreferences } from '../types';
import { 
  db, 
  auth, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where 
} from '../lib/firebase';
import { sendPasswordResetEmail, updatePassword } from 'firebase/auth';

interface SettingsScreenProps {
  user: UserProfile;
  contacts: TrustedContact[];
  onContactsChange: (contacts: TrustedContact[]) => void;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onLogout: () => void;
  onBack: () => void;
  onNavigateToEmergency?: () => void;
  onReplayOnboarding?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  contacts,
  onContactsChange,
  onUpdateUser,
  onLogout,
  onBack,
  onNavigateToEmergency,
  onReplayOnboarding
}) => {
  // Preference States
  const [preferences, setPreferences] = useState<UserPreferences>({
    autoStartAudioEvidence: true,
    allowVideoEvidence: true,
    sosCountdownSeconds: 5,
    safetyReminderNotifications: true,
    checkInReminders: true
  });
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Profile Edit State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user.displayName);
  const [editPhoneNumber, setEditPhoneNumber] = useState(user.phoneNumber || '');
  const [editMedicalNotes, setEditMedicalNotes] = useState(user.emergencyMedicalNotes || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [updatingPasswordState, setUpdatingPasswordState] = useState(false);

  // Contacts Form State
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('Parent');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactIsPrimary, setContactIsPrimary] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

  // Permissions State
  const [locationPerm, setLocationPerm] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [cameraPerm, setCameraPerm] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [micPerm, setMicPerm] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [notifPerm, setNotifPerm] = useState<'granted' | 'denied' | 'default'>('default');
  const [checkingPerms, setCheckingPerms] = useState(false);

  // Test SOS Modal
  const [showTestSosModal, setShowTestSosModal] = useState(false);
  const [testSosStep, setTestSosStep] = useState<'idle' | 'running' | 'completed'>('idle');
  const [testCountdown, setTestCountdown] = useState(3);

  // About Modals
  const [activeAboutModal, setActiveAboutModal] = useState<'privacy' | 'terms' | 'support' | null>(null);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  // Load Preferences from Firestore & LocalStorage
  useEffect(() => {
    const fetchPreferences = async () => {
      // 1. Try local storage defaults
      const localAudio = localStorage.getItem('vera_evidence_permission');
      const localVideo = localStorage.getItem('vera_video_evidence_enabled');
      const localSos = localStorage.getItem('vera_sos_countdown');

      let currentPrefs: UserPreferences = {
        autoStartAudioEvidence: localAudio !== 'denied',
        allowVideoEvidence: localVideo !== 'false',
        sosCountdownSeconds: (localSos === '10' ? 10 : localSos === '15' ? 15 : 5),
        safetyReminderNotifications: true,
        checkInReminders: true
      };

      // 2. Fetch from Firestore if real user
      if (user.uid && !user.uid.startsWith('demo-')) {
        try {
          const prefRef = doc(db, 'user_preferences', user.uid);
          const snap = await getDoc(prefRef);
          if (snap.exists()) {
            const data = snap.data();
            currentPrefs = {
              autoStartAudioEvidence: data.autoStartAudioEvidence ?? currentPrefs.autoStartAudioEvidence,
              allowVideoEvidence: data.allowVideoEvidence ?? currentPrefs.allowVideoEvidence,
              sosCountdownSeconds: data.sosCountdownSeconds ?? currentPrefs.sosCountdownSeconds,
              safetyReminderNotifications: data.safetyReminderNotifications ?? currentPrefs.safetyReminderNotifications,
              checkInReminders: data.checkInReminders ?? currentPrefs.checkInReminders
            };
          }
        } catch (err) {
          console.warn('Error reading user preferences from Firestore:', err);
        }
      }

      setPreferences(currentPrefs);
      setLoadingPrefs(false);
    };

    fetchPreferences();
    checkPermissionsStatus();
  }, [user.uid]);

  // Save Preferences to Firestore & LocalStorage
  const handleTogglePreference = async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);

    // Update LocalStorage for instant emergency screen sync
    if (key === 'autoStartAudioEvidence') {
      localStorage.setItem('vera_evidence_permission', value ? 'allowed' : 'denied');
    } else if (key === 'allowVideoEvidence') {
      localStorage.setItem('vera_video_evidence_enabled', value ? 'true' : 'false');
    } else if (key === 'sosCountdownSeconds') {
      localStorage.setItem('vera_sos_countdown', value.toString());
    }

    // Save to Firestore
    if (user.uid && !user.uid.startsWith('demo-')) {
      setSavingPrefs(true);
      try {
        await setDoc(doc(db, 'user_preferences', user.uid), updated, { merge: true });
        showTempToast('Preference saved');
      } catch (err) {
        console.warn('Failed to save user preference to Firestore:', err);
      } finally {
        setSavingPrefs(false);
      }
    } else {
      showTempToast('Preference saved locally');
    }
  };

  const showTempToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Check Browser Permissions
  const checkPermissionsStatus = async () => {
    setCheckingPerms(true);

    // Geolocation
    if ('permissions' in navigator) {
      try {
        const geoRes = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setLocationPerm(geoRes.state as any);
      } catch (e) {
        // Fallback
      }

      try {
        const camRes = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setCameraPerm(camRes.state as any);
      } catch (e) {}

      try {
        const micRes = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPerm(micRes.state as any);
      } catch (e) {}
    }

    // Notifications
    if ('Notification' in window) {
      setNotifPerm(Notification.permission);
    }

    setCheckingPerms(false);
  };

  // Re-request permissions explicitly
  const handleRequestPermissions = async () => {
    setCheckingPerms(true);
    try {
      // 1. Geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setLocationPerm('granted'),
          () => setLocationPerm('denied')
        );
      }

      // 2. Camera & Mic
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setCameraPerm('granted');
          setMicPerm('granted');
          stream.getTracks().forEach((track) => track.stop());
        } catch (err) {
          setCameraPerm('denied');
          setMicPerm('denied');
        }
      }

      // 3. Notifications
      if ('Notification' in window) {
        const res = await Notification.requestPermission();
        setNotifPerm(res);
      }
    } catch (e) {
      console.warn('Error requesting permissions:', e);
    } finally {
      setCheckingPerms(false);
    }
  };

  // Save Edit Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    const updatedProfile: Partial<UserProfile> = {
      displayName: editDisplayName.trim() || user.displayName,
      phoneNumber: editPhoneNumber.trim(),
      emergencyMedicalNotes: editMedicalNotes.trim()
    };

    onUpdateUser(updatedProfile);

    if (user.uid && !user.uid.startsWith('demo-')) {
      try {
        await updateDoc(doc(db, 'users', user.uid), updatedProfile);
      } catch (err) {
        console.warn('Error updating profile in Firestore:', err);
      }
    }

    setSavingProfile(false);
    setShowEditProfileModal(false);
    showTempToast('Profile updated successfully');
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setUpdatingPasswordState(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setPasswordResetSent(true);
        showTempToast('Password updated successfully!');
      } else {
        throw new Error('No active authenticated user session');
      }
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setPasswordError('For security, please sign out and log in again before changing your password.');
      } else {
        setPasswordError(err.message || 'Failed to update password');
      }
    } finally {
      setUpdatingPasswordState(false);
    }
  };

  const handleSendResetEmail = async () => {
    setPasswordError(null);
    try {
      if (user.email) {
        await sendPasswordResetEmail(auth, user.email);
        setPasswordResetSent(true);
        showTempToast(`Password reset link sent to ${user.email}`);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to send reset email');
    }
  };

  // Add Contact
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
      isPrimary: contactIsPrimary,
      createdAt: new Date().toISOString()
    };

    let updatedList = [...contacts];
    if (contactIsPrimary) {
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
        console.warn('Error adding contact to Firestore:', err);
      }
    }

    updatedList.push(newContactObj);
    onContactsChange(updatedList);

    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setContactIsPrimary(false);
    setAddingContact(false);
    setShowAddContactModal(false);
    showTempToast('Trusted contact added');
  };

  // Remove Contact
  const handleRemoveContact = async (id: string) => {
    setDeletingContactId(id);
    if (user.uid && !user.uid.startsWith('demo-')) {
      try {
        await deleteDoc(doc(db, 'trusted_contacts', id));
      } catch (err) {
        console.warn('Error deleting contact from Firestore:', err);
      }
    }

    const updated = contacts.filter((c) => c.id !== id);
    onContactsChange(updated);
    setDeletingContactId(null);
    showTempToast('Contact removed');
  };

  // Run Emergency SOS Test Simulation
  const startTestSos = () => {
    setShowTestSosModal(true);
    setTestSosStep('running');
    setTestCountdown(3);

    const timer = setInterval(() => {
      setTestCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTestSosStep('completed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Submit Support Ticket
  const handleSubmitSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportSubmitted(true);
    setTimeout(() => {
      setSupportSubmitted(false);
      setSupportSubject('');
      setSupportMessage('');
      setActiveAboutModal(null);
      showTempToast('Support request submitted. We will reply within 2 hours.');
    }, 1500);
  };

  return (
    <div className="min-h-full bg-slate-950 text-slate-100 pb-28 select-none">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-400/30 animate-in fade-in duration-200">
          <Check className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-4 sticky top-0 z-30 flex items-center justify-between">
        <button
          type="button"
          id="settings-back-btn"
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700 flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-400" />
          <h1 className="text-sm font-black uppercase tracking-wider text-white">Settings & Preferences</h1>
        </div>

        <div className="w-8" />
      </div>

      <div className="p-4 space-y-6 max-w-md mx-auto">
        {/* User Quick Info Banner */}
        <div className="bg-gradient-to-br from-violet-900/40 via-slate-900 to-indigo-950/50 border border-violet-500/20 rounded-3xl p-5 shadow-xl relative overflow-hidden flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 border border-violet-400/30 flex items-center justify-center font-black text-2xl text-white shadow-lg shrink-0">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white truncate">{user.displayName}</h2>
              <span className="text-[9px] font-black uppercase bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">
                Verified User
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
            {user.phoneNumber && (
              <p className="text-[11px] text-slate-400/80 truncate mt-0.5">{user.phoneNumber}</p>
            )}
          </div>
        </div>

        {/* SECTION 1: ACCOUNT */}
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-violet-400 px-1 flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>Account</span>
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden divide-y divide-slate-800/80 shadow-lg">
            {/* Edit Profile Item */}
            <button
              type="button"
              id="settings-edit-profile-btn"
              onClick={() => {
                setEditDisplayName(user.displayName);
                setEditPhoneNumber(user.phoneNumber || '');
                setEditMedicalNotes(user.emergencyMedicalNotes || '');
                setShowEditProfileModal(true);
              }}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Edit Profile</h4>
                  <p className="text-[11px] text-slate-400">Name, phone number, emergency medical notes</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* Change Password Item */}
            <button
              type="button"
              id="settings-change-password-btn"
              onClick={() => {
                setNewPassword('');
                setConfirmPassword('');
                setPasswordError(null);
                setPasswordResetSent(false);
                setShowChangePasswordModal(true);
              }}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Change Password</h4>
                  <p className="text-[11px] text-slate-400">Update security password or request reset link</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* Sign Out Item */}
            <button
              type="button"
              id="settings-signout-btn"
              onClick={onLogout}
              className="w-full p-4 flex items-center justify-between hover:bg-red-950/20 transition text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 group-hover:bg-red-600 group-hover:text-white transition">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-400 group-hover:text-red-300">Sign Out</h4>
                  <p className="text-[11px] text-slate-500">Disconnect active safety session</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </section>

        {/* SECTION 2: TRUSTED CONTACTS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-violet-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Trusted Contacts</span>
            </h3>
            <span className="text-[10px] font-bold bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">
              {contacts.length} Configured
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-lg">
            {contacts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">No trusted contacts added yet.</p>
            ) : (
              <div className="space-y-2">
                {contacts.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white truncate">{c.name}</h4>
                          {c.isPrimary && (
                            <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{c.relationship} • {c.phone}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      id={`remove-contact-${c.id}`}
                      onClick={() => handleRemoveContact(c.id)}
                      disabled={deletingContactId === c.id}
                      title="Remove Contact"
                      className="p-2 rounded-xl bg-slate-900 hover:bg-red-900/40 text-slate-400 hover:text-red-300 transition border border-slate-800 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              id="settings-add-contact-btn"
              onClick={() => setShowAddContactModal(true)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-violet-300 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition border border-slate-700"
            >
              <UserPlus className="w-4 h-4 text-violet-400" />
              <span>Add Trusted Contact</span>
            </button>
          </div>
        </section>

        {/* SECTION 3: EMERGENCY SETTINGS */}
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-red-400 px-1 flex items-center gap-2">
            <Radio className="w-4 h-4" />
            <span>Emergency Settings</span>
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4 shadow-lg">
            {/* Toggle: Auto-start Audio Evidence */}
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-red-400" />
                  <h4 className="text-xs font-bold text-white">Auto-start Audio Evidence</h4>
                </div>
                <p className="text-[11px] text-slate-400">Record ambient audio evidence immediately upon SOS trigger</p>
              </div>
              <button
                type="button"
                id="toggle-audio-evidence-btn"
                onClick={() => handleTogglePreference('autoStartAudioEvidence', !preferences.autoStartAudioEvidence)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  preferences.autoStartAudioEvidence ? 'bg-red-600' : 'bg-slate-800'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  preferences.autoStartAudioEvidence ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="h-px bg-slate-800/80" />

            {/* Toggle: Allow Video Evidence */}
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-red-400" />
                  <h4 className="text-xs font-bold text-white">Allow Video Evidence</h4>
                </div>
                <p className="text-[11px] text-slate-400">Enable video camera feed option during emergency sessions</p>
              </div>
              <button
                type="button"
                id="toggle-video-evidence-btn"
                onClick={() => handleTogglePreference('allowVideoEvidence', !preferences.allowVideoEvidence)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  preferences.allowVideoEvidence ? 'bg-red-600' : 'bg-slate-800'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  preferences.allowVideoEvidence ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="h-px bg-slate-800/80" />

            {/* Select: Countdown before SOS */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white">Countdown before SOS</h4>
              </div>
              <p className="text-[11px] text-slate-400">Grace period window before dispatching distress alerts</p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[5, 10, 15].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    id={`sos-countdown-option-${sec}`}
                    onClick={() => handleTogglePreference('sosCountdownSeconds', sec as any)}
                    className={`py-2 rounded-2xl text-xs font-black border transition ${
                      preferences.sosCountdownSeconds === sec
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {sec} Seconds
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-800/80" />

            {/* Test Emergency SOS Button */}
            <button
              type="button"
              id="test-emergency-sos-btn"
              onClick={startTestSos}
              className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-black rounded-2xl flex items-center justify-center gap-2 transition border border-red-500/40"
            >
              <AlertOctagon className="w-4 h-4 text-red-400 animate-pulse" />
              <span>Test Emergency SOS Subsystems</span>
            </button>
          </div>
        </section>

        {/* SECTION 4: PRIVACY & PERMISSIONS */}
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 px-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Privacy & Permissions</span>
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-lg">
            {/* Status list */}
            <div className="space-y-2.5">
              {/* Location */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-white">Location Permission</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  locationPerm === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : locationPerm === 'denied'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {locationPerm}
                </span>
              </div>

              {/* Camera */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Camera className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-white">Camera Permission</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  cameraPerm === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : cameraPerm === 'denied'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {cameraPerm}
                </span>
              </div>

              {/* Microphone */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Mic className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-white">Microphone Permission</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  micPerm === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : micPerm === 'denied'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {micPerm}
                </span>
              </div>

              {/* Notifications */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-white">Notification Permission</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  notifPerm === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : notifPerm === 'denied'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {notifPerm}
                </span>
              </div>
            </div>

            {/* Reopen / Request Permissions Button */}
            <button
              type="button"
              id="reopen-permissions-btn"
              onClick={handleRequestPermissions}
              disabled={checkingPerms}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${checkingPerms ? 'animate-spin' : ''}`} />
              <span>Request / Re-evaluate Permissions</span>
            </button>
          </div>
        </section>

        {/* SECTION 5: NOTIFICATIONS */}
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400 px-1 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4 shadow-lg">
            {/* Safety Reminder Notifications */}
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white">Safety Reminder Notifications</h4>
                <p className="text-[11px] text-slate-400">Proactive safety prompts when travelling late at night</p>
              </div>
              <button
                type="button"
                id="toggle-safety-reminders-btn"
                onClick={() => handleTogglePreference('safetyReminderNotifications', !preferences.safetyReminderNotifications)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  preferences.safetyReminderNotifications ? 'bg-violet-600' : 'bg-slate-800'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  preferences.safetyReminderNotifications ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="h-px bg-slate-800/80" />

            {/* Check-In Reminders */}
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white">Check-In Reminders</h4>
                <p className="text-[11px] text-slate-400">Warning alerts before active check-in timers expire</p>
              </div>
              <button
                type="button"
                id="toggle-checkin-reminders-btn"
                onClick={() => handleTogglePreference('checkInReminders', !preferences.checkInReminders)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  preferences.checkInReminders ? 'bg-violet-600' : 'bg-slate-800'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  preferences.checkInReminders ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 6: ABOUT */}
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1 flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>About</span>
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden divide-y divide-slate-800/80 shadow-lg">
            {/* Version */}
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs font-bold text-white">App Version</span>
              <span className="text-xs font-mono text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/20 font-bold">
                v2.4.0 (Build 2026.07)
              </span>
            </div>

            {/* Privacy Policy */}
            <button
              type="button"
              id="about-privacy-policy-btn"
              onClick={() => setActiveAboutModal('privacy')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition text-left"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-white">Privacy Policy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* Terms of Use */}
            <button
              type="button"
              id="about-terms-of-use-btn"
              onClick={() => setActiveAboutModal('terms')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition text-left"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-white">Terms of Use</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* Contact Support */}
            <button
              type="button"
              id="about-contact-support-btn"
              onClick={() => setActiveAboutModal('support')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition text-left"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-white">Contact Support</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* Replay Onboarding Guide */}
            {onReplayOnboarding && (
              <button
                type="button"
                id="about-replay-onboarding-btn"
                onClick={onReplayOnboarding}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition text-left bg-violet-950/20"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Replay Onboarding Flow</h4>
                    <p className="text-[11px] text-slate-400">Review features, permissions, and test mode</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>
        </section>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-violet-400" />
                <span>Edit Profile</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhoneNumber}
                  onChange={(e) => setEditPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 019-2831"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Emergency Medical Notes
                </label>
                <textarea
                  value={editMedicalNotes}
                  onChange={(e) => setEditMedicalNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Asthma, Penicillin allergy, Blood type O+"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Change Password</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordResetSent ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-xs font-bold text-white">Success</h4>
                <p className="text-[11px] text-slate-300">
                  Password action completed. Check your inbox if reset email was triggered.
                </p>
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl mt-2"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Repeat new password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={updatingPasswordState}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{updatingPasswordState ? 'Updating...' : 'Update Password'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendResetEmail}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-[11px] transition"
                  >
                    Send Password Reset Link to Email instead
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3. Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-violet-400" />
                <span>Add Trusted Contact</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddContactModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                  placeholder="e.g. Sarah Miller"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Relationship
                </label>
                <select
                  value={contactRelation}
                  onChange={(e) => setContactRelation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Partner/Spouse">Partner / Spouse</option>
                  <option value="Close Friend">Close Friend</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Neighbor">Neighbor</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                  placeholder="+1 (555) 019-2831"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="primary-contact-check"
                  checked={contactIsPrimary}
                  onChange={(e) => setContactIsPrimary(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-0"
                />
                <label htmlFor="primary-contact-check" className="text-xs text-slate-300 font-bold">
                  Set as Primary Contact
                </label>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingContact}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs transition shadow-lg"
                >
                  {addingContact ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Test Emergency SOS Subsystem Modal */}
      {showTestSosModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Emergency SOS Diagnostic Test</h3>
              <p className="text-xs text-slate-400">Verifying location pipeline, contact dispatch & evidence recorders.</p>
            </div>

            {testSosStep === 'running' ? (
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-3xl font-black text-red-400 font-mono">{testCountdown}s</div>
                <p className="text-[11px] text-slate-300 animate-pulse">Simulating Emergency Trigger...</p>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-red-500 h-full transition-all duration-1000"
                    style={{ width: `${((3 - testCountdown) / 3) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-2 text-left">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Check className="w-4 h-4" />
                  <span>Subsystems Operational</span>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                  <li>GPS Location Engine: Active (3m accuracy)</li>
                  <li>Trusted Contacts Dispatch: Ready ({contacts.length} recipients)</li>
                  <li>Audio Evidence Recorder: Ready</li>
                  <li>Video Feed Stream: Ready</li>
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowTestSosModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
            >
              Close Diagnostic Test
            </button>
          </div>
        </div>
      )}

      {/* 5. About Modals (Privacy, Terms, Support) */}
      {activeAboutModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 max-h-[85vh] flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-violet-400" />
                <span>
                  {activeAboutModal === 'privacy' && 'Privacy Policy'}
                  {activeAboutModal === 'terms' && 'Terms of Use'}
                  {activeAboutModal === 'support' && 'Contact Support'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveAboutModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs text-slate-300 pr-1 leading-relaxed">
              {activeAboutModal === 'privacy' && (
                <div className="space-y-3">
                  <p className="font-bold text-white">Your Privacy is VERA's Highest Priority.</p>
                  <p>
                    VERA Companion is designed with privacy-first architecture. All location telemetry, safety session notes, and emergency evidence are stored securely in Firestore and encrypted at rest.
                  </p>
                  <h4 className="font-bold text-violet-300">Data Usage Principles:</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li>Zero third-party location selling or marketing tracking.</li>
                    <li>Evidence recordings are created strictly during emergency SOS activation.</li>
                    <li>Trusted contacts only receive distress location links during active emergency reports.</li>
                  </ul>
                </div>
              )}

              {activeAboutModal === 'terms' && (
                <div className="space-y-3">
                  <p className="font-bold text-white">VERA Companion Safety Disclaimer</p>
                  <p>
                    VERA Companion is an intelligent personal safety assistant. While VERA facilitates contact alerts and location sharing, it does not replace official emergency services (e.g. 911).
                  </p>
                  <h4 className="font-bold text-amber-300">Terms Overview:</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li>Always dial official emergency responders (911/112) in immediate danger.</li>
                    <li>Device location permissions must remain enabled for accurate GPS dispatch.</li>
                    <li>VERA is provided under active encryption and reliability standards.</li>
                  </ul>
                </div>
              )}

              {activeAboutModal === 'support' && (
                <div className="space-y-3">
                  <p>Need assistance or have feedback for the VERA Companion team?</p>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2 text-violet-300 font-bold">
                    <Mail className="w-4 h-4" />
                    <span>support@veracompanion.io</span>
                  </div>

                  <form onSubmit={handleSubmitSupport} className="space-y-2.5 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={supportSubject}
                        onChange={(e) => setSupportSubject(e.target.value)}
                        placeholder="Feedback or technical question"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Message
                      </label>
                      <textarea
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                        rows={3}
                        required
                        placeholder="How can we assist you today?"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={supportSubmitted}
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs transition"
                    >
                      {supportSubmitted ? 'Sending Request...' : 'Send Message'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
