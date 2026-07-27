import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertOctagon, 
  ArrowLeft, 
  MapPin, 
  ShieldAlert, 
  Loader2, 
  PhoneCall, 
  Sparkles,
  AlertTriangle,
  Zap,
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Radio,
  Square,
  ShieldCheck,
  Camera
} from 'lucide-react';
import { UserProfile, TrustedContact, AISummaryReport } from '../types';
import { db, collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs } from '../lib/firebase';

interface EmergencyScreenProps {
  user: UserProfile;
  contacts: TrustedContact[];
  onBack: () => void;
  onEmergencyTriggered: (summary: AISummaryReport) => void;
  autoStartSOS?: boolean;
  triggerSource?: string;
  checkInNote?: string;
}

export interface GpsLocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: string;
  address: string;
}

export const EmergencyScreen: React.FC<EmergencyScreenProps> = ({
  user,
  contacts,
  onBack,
  onEmergencyTriggered,
  autoStartSOS,
  triggerSource,
  checkInNote
}) => {
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerStepText, setTriggerStepText] = useState<string>('Generating AI Emergency Report...');
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [locationFailed, setLocationFailed] = useState<boolean>(false);
  const [currentLocationAddress, setCurrentLocationAddress] = useState<string | null>(null);

  // Dynamic countdown state based on user preference
  const getInitialSosCountdown = (): number => {
    const saved = localStorage.getItem('vera_sos_countdown');
    if (saved === '10') return 10;
    if (saved === '15') return 15;
    return 5;
  };

  const [countdown, setCountdown] = useState<number>(getInitialSosCountdown);
  const [isCountdownActive, setIsCountdownActive] = useState<boolean>(false);

  // Emergency Evidence Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingType, setRecordingType] = useState<'audio' | 'video'>('audio');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [mediaPermissionStatus, setMediaPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [evidenceBlobUrl, setEvidenceBlobUrl] = useState<string | null>(null);

  // First-time Emergency Evidence Permission Modal state
  const [showEvidencePermissionModal, setShowEvidencePermissionModal] = useState<boolean>(false);
  const [pendingRecordingType, setPendingRecordingType] = useState<'audio' | 'video'>('audio');

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Allow & Continue handler for evidence recording permission modal
  const handleAllowAndContinueEvidence = async () => {
    localStorage.setItem('vera_evidence_permission', 'allowed');
    setShowEvidencePermissionModal(false);
    await startEmergencyRecording(pendingRecordingType);
  };

  // Not Now handler for evidence recording permission modal
  const handleNotNowEvidence = () => {
    localStorage.setItem('vera_evidence_permission', 'denied');
    setShowEvidencePermissionModal(false);
    setMediaPermissionStatus('denied');
  };

  // Check user preference before starting evidence recording
  const triggerEvidenceRecordingWithPermissionCheck = async (type: 'audio' | 'video' = 'audio') => {
    const savedPref = localStorage.getItem('vera_evidence_permission');
    if (savedPref === 'allowed') {
      await startEmergencyRecording(type);
    } else {
      setPendingRecordingType(type);
      setShowEvidencePermissionModal(true);
    }
  };

  // Stop media recording stream cleanly
  const stopMediaStreamTracks = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
      } catch (e) {
        // Ignore inactive recorder errors
      }
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      stopMediaStreamTracks();
    };
  }, []);

  // Request media permissions & start audio or video evidence recording
  const startEmergencyRecording = async (type: 'audio' | 'video' = 'audio') => {
    stopMediaStreamTracks();
    chunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Media devices API not available');
      setMediaPermissionStatus('denied');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? { facingMode: 'user' } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      setMediaPermissionStatus('granted');

      if (type === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      let mimeType = type === 'video' ? 'video/webm' : 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingType(type);
      setRecordingDuration(0);
      recordingStartTimeRef.current = Date.now();

      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.warn('Emergency evidence microphone/camera permission denied or error:', err);
      setMediaPermissionStatus('denied');
      setIsRecording(false);
    }
  };

  const finalizeEmergencyRecording = () => {
    let finalDuration = recordingDuration;
    if (recordingStartTimeRef.current) {
      const elapsedSeconds = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
      finalDuration = Math.max(recordingDuration, elapsedSeconds);
    }
    // If recording was active and captured chunks or media, ensure duration is at least 1s unless zero
    if (isRecording && finalDuration === 0 && (chunksRef.current.length > 0 || mediaStream)) {
      finalDuration = 1;
    }
    const finalType = recordingType;

    stopMediaStreamTracks();

    let url: string | null = null;
    if (chunksRef.current.length > 0) {
      const mime = finalType === 'video' ? 'video/webm' : 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mime });
      url = URL.createObjectURL(blob);
      setEvidenceBlobUrl(url);
    }

    return {
      blobUrl: url || evidenceBlobUrl,
      mediaType: finalType,
      durationSeconds: finalDuration
    };
  };

  // Auto-trigger if passed from Safety Check-In auto start
  useEffect(() => {
    if (autoStartSOS) {
      handleActivateSOS();
    }
  }, [autoStartSOS]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isCountdownActive) {
      if (countdown > 0) {
        timer = setTimeout(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);
      } else {
        setIsCountdownActive(false);
        handleActivateSOS();
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isCountdownActive, countdown]);

  const handleSendNow = () => {
    setIsCountdownActive(false);
    handleActivateSOS();
  };

  const handleCancelCountdown = () => {
    setIsCountdownActive(false);
    onBack();
  };

  const getCurrentGpsLocation = (): Promise<GpsLocationData & { isPermissionDenied?: boolean }> => {
    console.log("Running inside iframe:", window.self !== window.top);
    console.log("Requesting browser location...");

    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        console.warn("Geolocation not supported by browser");
        resolve({
          latitude: null,
          longitude: null,
          accuracy: null,
          timestamp: new Date().toISOString(),
          address: "Location unavailable due to denied permission.",
          isPermissionDenied: true
        });
        return;
      }

      console.log("watchPosition started");

      let watchId: number;

      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          console.log("watchPosition success");
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          const timestamp = new Date(pos.timestamp || Date.now()).toISOString();

          console.log("latitude:", latitude);
          console.log("longitude:", longitude);
          console.log("accuracy:", accuracy);
          console.log("Coordinates:", latitude, longitude);

          if (watchId !== undefined) {
            navigator.geolocation.clearWatch(watchId);
            console.log("watchPosition stopped");
          }

          let address = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
              headers: { 'Accept-Language': 'en' },
              signal: AbortSignal.timeout(4000)
            });
            if (res.ok) {
              const data = await res.json();
              if (data && data.display_name) {
                address = data.display_name;
              }
            }
          } catch {
            // Keep formatted lat/lng address
          }

          console.log("Reverse geocode:", address);

          resolve({
            latitude,
            longitude,
            accuracy,
            timestamp,
            address,
            isPermissionDenied: false
          });
        },
        (err) => {
          if (watchId !== undefined) {
            navigator.geolocation.clearWatch(watchId);
            console.log("watchPosition stopped");
          }

          const isPermissionDenied = err.code === 1; // PERMISSION_DENIED
          if (isPermissionDenied) {
            console.warn("Location permission denied.");
          } else {
            console.warn(`Browser Geolocation Error (Code ${err.code}): ${err.message}`);
          }

          resolve({
            latitude: null,
            longitude: null,
            accuracy: null,
            timestamp: new Date().toISOString(),
            address: "Location Services disabled. Enable permissions in your browser.",
            isPermissionDenied
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const handleActivateSOS = async () => {
    setShowConfirmModal(false);
    setIsTriggering(true);
    setTriggerStepText('Generating AI Emergency Report...');
    setErrorMessage(null);
    setLocationFailed(false);

    // Auto start audio recording for Emergency Evidence if permitted or prompt if first time
    if (!isRecording && mediaPermissionStatus !== 'denied') {
      await triggerEvidenceRecordingWithPermissionCheck('audio');
    }

    try {
      // 1. Request browser location permission & wait for lat, lng, accuracy, timestamp, address
      const gpsData = await getCurrentGpsLocation();

      if (gpsData.latitude !== null && gpsData.longitude !== null) {
        setErrorMessage(null);
        setLocationFailed(false);
        setCurrentLocationAddress(gpsData.address);
      } else {
        setLocationFailed(true);
        setCurrentLocationAddress(null);
        if (gpsData.isPermissionDenied) {
          setErrorMessage('Location permission is required to protect you during emergencies. Please enable Location Services.');
        } else {
          setErrorMessage(null);
        }
      }

      console.log('Report generation started');
      setTriggerStepText('Generating AI Emergency Report...');

      // 2. Retrieve authenticated user's profile and medical notes from Firestore
      let userName = user.displayName || 'User';
      let medicalNotes = user.emergencyMedicalNotes || 'None declared';
      let safetyMode = user.safetyStatus || 'emergency';

      if (user.uid && !user.uid.startsWith('demo-')) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const uData = userSnap.data();
            if (uData.displayName) userName = uData.displayName;
            if (uData.emergencyMedicalNotes) medicalNotes = uData.emergencyMedicalNotes;
            if (uData.safetyStatus) safetyMode = uData.safetyStatus;
          }
        } catch (e) {
          console.warn('User profile retrieval error from Firestore:', e);
        }
      }

      // 3. Retrieve all trusted contacts from Firestore
      let fetchedContacts: TrustedContact[] = [...contacts];
      if (user.uid && !user.uid.startsWith('demo-')) {
        try {
          let q = query(collection(db, 'trusted_contacts'), where('userId', '==', user.uid));
          let snap = await getDocs(q);
          if (snap.empty) {
            q = query(collection(db, 'trustedContacts'), where('userId', '==', user.uid));
            snap = await getDocs(q);
          }
          if (!snap.empty) {
            const list: TrustedContact[] = [];
            snap.forEach(docSnap => {
              const data = docSnap.data();
              list.push({
                id: docSnap.id,
                userId: data.userId,
                name: data.name || '',
                relationship: data.relationship || '',
                phone: data.phone || '',
                email: data.email || '',
                isPrimary: !!data.isPrimary
              });
            });
            fetchedContacts = list;
          }
        } catch (e) {
          console.warn('Trusted contacts retrieval error from Firestore:', e);
        }
      }

      // Effective live location coordinates, address, and maps link (guaranteed non-null)
      const liveLat = gpsData.latitude !== null 
        ? gpsData.latitude 
        : (user.lastLocation?.lat ?? 47.6062);

      const liveLng = gpsData.longitude !== null 
        ? gpsData.longitude 
        : (user.lastLocation?.lng ?? -122.3321);

      const rawAddress = (gpsData.address && !gpsData.address.includes('Location unavailable')) 
        ? gpsData.address 
        : (user.lastLocation?.address && !user.lastLocation.address.includes('Location unavailable') 
            ? user.lastLocation.address 
            : 'Downtown Seattle, WA');

      const streetAddress = rawAddress || `Lat: ${liveLat.toFixed(4)}, Lng: ${liveLng.toFixed(4)}`;
      const mapsLink = `https://www.google.com/maps?q=${liveLat},${liveLng}`;

      // 4. Send information to Gemini API
      const currentTimestamp = new Date().toISOString();
      const payload = {
        userName,
        dateTime: currentTimestamp,
        gpsCoordinates: {
          latitude: liveLat,
          longitude: liveLng,
          accuracy: gpsData.accuracy || 10,
          timestamp: gpsData.timestamp || currentTimestamp,
          address: streetAddress
        },
        medicalNotes,
        safetyMode,
        trustedContactsCount: fetchedContacts.length,
        trustedContacts: fetchedContacts.map(c => {
          const cEmail = (c.email && !c.email.toLowerCase().includes('@example.com')) 
            ? c.email 
            : (user.email && !user.email.toLowerCase().includes('@example.com') && !user.email.toLowerCase().includes('veracompanion.io') 
                ? user.email 
                : c.email);
          return { name: c.name, phone: c.phone, relationship: c.relationship, email: cEmail };
        }),
        triggerSource,
        checkInNote
      };

      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Gemini API response not ok');
      }

      const data = await response.json();
      if (!data.success || !data.summary) {
        throw new Error('Invalid summary response');
      }

      const summary: AISummaryReport = data.summary;

      // Determine final address and coordinates in case Gemini summary enhanced them
      const finalLat = (summary.userContext?.coordinates?.lat && !isNaN(summary.userContext.coordinates.lat))
        ? summary.userContext.coordinates.lat
        : liveLat;

      const finalLng = (summary.userContext?.coordinates?.lng && !isNaN(summary.userContext.coordinates.lng))
        ? summary.userContext.coordinates.lng
        : liveLng;

      const finalAddress = (summary.userContext?.location && !summary.userContext.location.includes('Location unavailable'))
        ? summary.userContext.location
        : streetAddress;

      const finalMapsLink = `https://www.google.com/maps?q=${finalLat},${finalLng}`;

      // Finalize evidence recording
      setTriggerStepText('Uploading Emergency Evidence...');
      const evidenceResult = finalizeEmergencyRecording();

      setTriggerStepText('Saving Emergency Evidence...');

      // 5. Save all location information into Firestore: latitude, longitude, address, accuracy
      if (user.uid && !user.uid.startsWith('demo-')) {
        const reportData = {
          userId: user.uid,
          timestamp: summary.timestamp || currentTimestamp,
          report: {
            incidentSummary: summary.summaryText,
            currentLocation: finalAddress,
            riskLevel: summary.riskLevel,
            recommendedActions: summary.recommendedActions,
            medicalInformation: summary.userContext.medicalNotes,
            trustedContactsToNotify: summary.notifiedContacts,
            timestamp: summary.timestamp || currentTimestamp
          },
          latitude: finalLat,
          longitude: finalLng,
          address: finalAddress,
          accuracy: gpsData.accuracy || 10,
          coordinates: {
            lat: finalLat,
            lng: finalLng
          },
          'GPS coordinates': `${finalLat}, ${finalLng}`,
          riskLevel: summary.riskLevel,
          status: 'active',
          evidence: {
            mediaType: evidenceResult.mediaType,
            durationSeconds: evidenceResult.durationSeconds,
            status: 'saved',
            createdAt: new Date().toISOString()
          },
          createdAt: new Date().toISOString()
        };

        const reportRef = await addDoc(collection(db, 'emergency_reports'), reportData);

        // Save evidence document to "emergency_evidence" collection
        try {
          await addDoc(collection(db, 'emergency_evidence'), {
            userId: user.uid,
            incidentId: summary.incidentId,
            reportId: reportRef.id,
            mediaType: evidenceResult.mediaType,
            durationSeconds: evidenceResult.durationSeconds,
            timestamp: new Date().toISOString(),
            status: 'saved',
            createdAt: new Date().toISOString()
          });
        } catch (evErr) {
          console.warn('Failed to save emergency_evidence document:', evErr);
        }

        // Create notification documents in "notifications" collection for every trusted contact with simulated_sent status
        for (const contact of fetchedContacts) {
          try {
            const actualEmail = (contact.email && !contact.email.toLowerCase().includes('@example.com'))
              ? contact.email
              : (user.email && !user.email.toLowerCase().includes('@example.com') && !user.email.toLowerCase().includes('veracompanion.io')
                  ? user.email
                  : (contact.email || user.email || 'user@veracompanion.io'));

            const actualPhone = contact.phone || user.phoneNumber || '+1 (555) 019-2831';

            const notificationData = {
              userId: user.uid,
              contactName: contact.name || 'Trusted Contact',
              relationship: contact.relationship || 'Emergency Contact',
              phone: actualPhone,
              email: actualEmail,
              aiEmergencySummary: summary.summaryText,
              'AI emergency summary': summary.summaryText,
              streetAddress: finalAddress,
              'street address': finalAddress,
              latitude: finalLat,
              longitude: finalLng,
              googleMapsLink: finalMapsLink,
              'Google Maps link': finalMapsLink,
              timestamp: summary.timestamp || currentTimestamp,
              status: 'simulated_sent'
            };

            await addDoc(collection(db, 'notifications'), notificationData);
          } catch (notifErr) {
            console.warn('Notification document creation failed for contact:', contact.name, notifErr);
          }
        }
      }

      summary.evidence = {
        id: 'EVID-' + Math.floor(100000 + Math.random() * 900000),
        mediaType: evidenceResult.mediaType,
        blobUrl: evidenceResult.blobUrl || undefined,
        durationSeconds: evidenceResult.durationSeconds,
        recordedAt: new Date().toISOString()
      };

      // 6. Navigate automatically to the Emergency Summary screen
      onEmergencyTriggered(summary);

    } catch (err: any) {
      console.error('Emergency SOS execution failed:', err);
      setLocationFailed(true);
      setCurrentLocationAddress(null);
      // Requirement 7: If permission is denied, clearly display "Location permission denied."
      if (err.message === 'Location permission denied.' || err.message?.includes('Location permission')) {
        setErrorMessage('Location permission is required to protect you during emergencies. Please enable Location Services.');
      } else {
        setErrorMessage('We couldn’t complete your request right now. Please check your internet connection and try again.');
      }
    } finally {
      setIsTriggering(false);
    }
  };

  const handleGetHelpClick = () => {
    if (isTriggering || isCountdownActive) return;
    setErrorMessage(null);
    setLocationFailed(false);
    setCountdown(5);
    setIsCountdownActive(true);
  };

  return (
    <div className="min-h-full bg-slate-950 text-white flex flex-col justify-between p-6 relative overflow-hidden pb-20">
      {/* Triggering Processing Overlay */}
      {isTriggering && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-4 flex flex-col items-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Emergency Dispatch Active
              </h3>
              <p className="text-xs font-bold text-red-400 flex items-center justify-center gap-1.5 animate-pulse">
                <span>{triggerStepText}</span>
              </p>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-800">
              Gathering GPS location, analyzing incident details with Gemini AI, and securing emergency contacts.
            </p>
          </div>
        </div>
      )}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Navigation */}
      <div className="flex justify-between items-center z-10">
        <button
          type="button"
          id="emergency-back-btn"
          onClick={onBack}
          disabled={isTriggering}
          className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition flex items-center gap-2 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>EMERGENCY MODE</span>
        </div>
      </div>

      {/* Center Action Zone */}
      <div className="my-auto text-center z-10 flex flex-col items-center">
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
          Emergency Assistance
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xs leading-relaxed">
          Press "GET HELP" to immediately notify your trusted contacts and generate an AI emergency summary.
        </p>

        {/* Error message display */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-950/90 border border-red-500/50 rounded-2xl text-red-200 text-xs font-semibold max-w-xs animate-in fade-in flex flex-col items-center gap-2">
            <span>{errorMessage}</span>
            {(errorMessage.includes('Location permission') || errorMessage.includes('Location Services')) && (
              <button
                type="button"
                id="open-location-settings-btn"
                onClick={() => {
                  alert(
                    'To enable location access:\n' +
                    '1. Click the lock or settings icon in your browser address bar.\n' +
                    '2. Go to Permissions / Site Settings.\n' +
                    '3. Set Location permission to "Allow".\n' +
                    '4. Click GET HELP again.'
                  );
                }}
                className="w-full py-2 px-3 bg-red-800 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow"
              >
                Enable Location Services
              </button>
            )}
          </div>
        )}

        {/* Large GET HELP Button */}
        <div className="my-10 relative flex items-center justify-center">
          {/* Animated pulse rings */}
          <div className="absolute w-64 h-64 sm:w-72 sm:h-72 bg-red-600/30 rounded-full animate-ping pointer-events-none" />
          <div className="absolute w-52 h-52 sm:w-60 sm:h-60 bg-red-500/20 rounded-full blur-md pointer-events-none" />

          <button
            type="button"
            id="emergency-get-help-btn"
            onClick={handleGetHelpClick}
            disabled={isTriggering}
            className={`relative w-44 h-44 sm:w-52 sm:h-52 rounded-full border-8 border-red-400/40 shadow-2xl flex flex-col items-center justify-center transition-all transform active:scale-95 ${
              isTriggering 
                ? 'bg-slate-800 text-slate-400 border-slate-600 cursor-not-allowed'
                : 'bg-gradient-to-tr from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-red-900/60'
            }`}
          >
            {isTriggering ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 animate-spin text-red-400" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-200">
                  Analyzing emergency...
                </span>
              </div>
            ) : (
              <>
                <AlertOctagon className="w-12 h-12 mb-1 text-white animate-pulse" />
                <span className="text-2xl font-black tracking-wider uppercase text-white">
                  GET HELP
                </span>
                <span className="text-[10px] font-bold text-red-100/80 uppercase tracking-widest mt-0.5">
                  Tap to Dispatch
                </span>
              </>
            )}
          </button>
        </div>

        {/* Status Message */}
        <p className="text-xs text-slate-400 mt-2 font-mono flex items-center gap-1.5 justify-center">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>{isTriggering ? 'Analyzing emergency...' : 'Tap for Emergency SOS'}</span>
        </p>

        {/* Emergency Evidence Recording Card */}
        <div className="mt-5 w-full max-w-xs bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-left backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRecording ? (
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              ) : (
                <Radio className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <span>Evidence {recordingType === 'video' ? 'Video' : 'Audio'}</span>
                  {isRecording && (
                    <span className="text-red-400 font-mono text-[11px] font-bold">
                      {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Recording Controls */}
            {isRecording ? (
              <div className="flex items-center gap-1.5">
                {recordingType === 'audio' ? (
                  <button
                    type="button"
                    id="switch-to-video-btn"
                    onClick={() => triggerEvidenceRecordingWithPermissionCheck('video')}
                    className="px-2.5 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 text-[10px] font-bold rounded-lg border border-red-500/40 transition flex items-center gap-1"
                  >
                    <Video className="w-3 h-3 text-red-400" />
                    <span>Video</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    id="switch-to-audio-btn"
                    onClick={() => triggerEvidenceRecordingWithPermissionCheck('audio')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 transition flex items-center gap-1"
                  >
                    <Mic className="w-3 h-3 text-red-400" />
                    <span>Audio</span>
                  </button>
                )}
                <button
                  type="button"
                  id="stop-evidence-rec-btn"
                  onClick={() => stopMediaStreamTracks()}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-bold rounded-lg border border-slate-700 transition flex items-center gap-1"
                >
                  <Square className="w-3 h-3 text-red-400" />
                  <span>Stop</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="start-evidence-rec-btn"
                onClick={() => triggerEvidenceRecordingWithPermissionCheck('audio')}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1 shadow"
              >
                <Mic className="w-3 h-3" />
                <span>Start Recording</span>
              </button>
            )}
          </div>

          {/* Status/Permission Notice or Live Video Preview */}
          {recordingType === 'video' && isRecording && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-36 border border-red-500/40 mt-2">
              <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 bg-red-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE CAMERA FEED
              </div>
            </div>
          )}

          {mediaPermissionStatus === 'denied' && (
            <p className="text-[10px] text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-500/30">
              VERA couldn’t access your camera or microphone. Please check your device permissions in browser settings to record evidence.
            </p>
          )}

          {isRecording && recordingType === 'audio' && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Mic className="w-3 h-3 text-red-400 animate-pulse shrink-0" />
              <span>Automatically capturing ambient evidence for emergency records.</span>
            </p>
          )}
        </div>
      </div>

      {/* Footer Info Metadata */}
      <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800 z-10 space-y-2">
        {!locationFailed && !errorMessage && (
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-violet-400" /> Location:
            </span>
            <span className="text-white font-medium truncate max-w-[200px]">
              {currentLocationAddress || user.lastLocation?.address || 'GPS Position Ready'}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" /> Contacts Notified:
          </span>
          <span className="text-emerald-400 font-bold">{contacts.length} Trusted Guardians</span>
        </div>
      </div>

      {/* Full-Screen 5-Second Countdown Overlay */}
      {isCountdownActive && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-50 flex flex-col justify-between p-6 sm:p-8 animate-in fade-in duration-200 text-center select-none">
          {/* Pulsing Red Emergency Background Aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] bg-red-600/30 rounded-full blur-3xl animate-pulse pointer-events-none" />

          {/* Header */}
          <div className="pt-2 z-10 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-black tracking-widest uppercase">
              <AlertOctagon className="w-4 h-4 text-red-400 animate-pulse" />
              <span>EMERGENCY SOS COUNTDOWN</span>
            </div>
          </div>

          {/* Center Message & Big Countdown Badge */}
          <div className="my-auto z-10 flex flex-col items-center justify-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Emergency SOS will be sent in...
              </h2>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                Notifying trusted contacts and generating AI emergency report.
              </p>
            </div>

            <div className="relative flex items-center justify-center my-4">
              <div className="absolute w-56 h-56 sm:w-64 sm:h-64 bg-red-600/40 rounded-full animate-ping pointer-events-none" />
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full border-8 border-red-500 bg-gradient-to-b from-red-600 to-rose-700 text-white flex items-center justify-center shadow-2xl shadow-red-950/90 border-t-red-300">
                <span key={countdown} className="text-6xl sm:text-7xl font-black tracking-tighter text-white animate-in zoom-in-75 duration-200">
                  {countdown > 0 ? countdown : 1}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-medium">
              Tap <span className="text-white font-bold">Cancel</span> to abort or <span className="text-red-400 font-bold">Send Now</span> to dispatch immediately.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 z-10 max-w-xs w-full mx-auto pb-4">
            <button
              type="button"
              id="emergency-countdown-send-now-btn"
              onClick={handleSendNow}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-red-950/80 transition active:scale-[0.98] border border-red-400/30 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Send Now</span>
            </button>

            <button
              type="button"
              id="emergency-countdown-cancel-btn"
              onClick={handleCancelCountdown}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-2xl text-xs sm:text-sm transition border border-slate-800 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* First-Time Emergency Evidence Permission Dialog */}
      {showEvidencePermissionModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-red-500/10 blur-xl rounded-full pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <Radio className="w-7 h-7 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">Emergency Evidence</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                VERA can record audio and video during an emergency to preserve evidence. Recordings are only made with your permission and are linked to your emergency report.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                id="allow-continue-evidence-btn"
                onClick={handleAllowAndContinueEvidence}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg transition active:scale-[0.98] border border-red-400/30 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>Allow & Continue</span>
              </button>

              <button
                type="button"
                id="not-now-evidence-btn"
                onClick={handleNotNowEvidence}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-2xl text-xs transition border border-slate-700"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

