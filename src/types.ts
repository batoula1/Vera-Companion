export type ScreenType = 'welcome' | 'onboarding' | 'home' | 'emergency' | 'contacts' | 'ai_summary' | 'safety_checkin' | 'safe_walk' | 'fake_call' | 'settings' | 'history';

export interface UserPreferences {
  autoStartAudioEvidence: boolean;
  allowVideoEvidence: boolean;
  sosCountdownSeconds: 5 | 10 | 15;
  safetyReminderNotifications: boolean;
  checkInReminders: boolean;
}

export interface SafeWalkSessionDoc {
  id?: string;
  userId: string;
  destination: string;
  transportMode: 'walking' | 'driving';
  expectedDuration: string;
  startTime: string;
  optionalNote: string;
  status: 'active' | 'completed' | 'extended' | 'expired' | 'emergency';
  completedTime: string | null;
}

export interface SafetyCheckInDoc {
  id?: string;
  userId: string;
  startTime: string;
  selectedDuration: string;
  optionalNote: string;
  status: 'active' | 'safe' | 'extended' | 'expired' | 'emergency';
  completedTime: string | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  emergencyMedicalNotes?: string;
  safetyStatus?: 'safe' | 'warning' | 'emergency';
  hasCompletedOnboarding?: boolean;
  lastLocation?: {
    address: string;
    lat: number;
    lng: number;
    updatedAt: string;
  };
}

export interface TrustedContact {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary?: boolean;
  createdAt?: string;
}

export interface EmergencyEvidenceDoc {
  id?: string;
  userId: string;
  incidentId: string;
  reportId?: string;
  mediaType: 'audio' | 'video';
  timestamp: string;
  durationSeconds: number;
  blobUrl?: string;
  base64Data?: string;
  status: 'recording' | 'saved' | 'failed';
}

export interface AISummaryReport {
  incidentId: string;
  timestamp: string;
  incidentType: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status?: 'ACTIVE' | 'RESOLVED';
  summaryText: string;
  userContext: {
    userName: string;
    location: string;
    coordinates?: { lat: number; lng: number };
    medicalNotes?: string;
    batteryLevel?: string;
  };
  keyFindings: string[];
  recommendedActions: string[];
  notifiedContacts: Array<{ name: string; phone: string; relationship: string }>;
  rawAiFormattedReport?: string;
  evidence?: {
    id?: string;
    mediaType: 'audio' | 'video';
    blobUrl?: string;
    durationSeconds: number;
    recordedAt: string;
  };
}

export interface EmergencyIncident {
  id: string;
  userId: string;
  timestamp: string;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  triggerType: 'MANUAL_GET_HELP' | 'SAFETY_TIMER_EXPIRED' | 'VOICE_TRIGGER';
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  aiSummary?: AISummaryReport;
}
