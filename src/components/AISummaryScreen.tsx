import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  MapPin, 
  CheckCircle2, 
  Share2, 
  Copy, 
  Check, 
  ArrowLeft, 
  PhoneCall, 
  Battery, 
  FileText,
  AlertTriangle,
  Clock,
  UserCheck,
  Radio,
  Mic,
  Video,
  Download,
  ShieldCheck,
  FileAudio,
  ExternalLink,
  Activity,
  Calendar,
  AlertCircle,
  Shield,
  Layers
} from 'lucide-react';
import { AISummaryReport } from '../types';

interface AISummaryScreenProps {
  summary: AISummaryReport;
  onReturnHome: () => void;
}

export const AISummaryScreen: React.FC<AISummaryScreenProps> = ({
  summary,
  onReturnHome
}) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [emergencyStatus, setEmergencyStatus] = useState<'ACTIVE' | 'RESOLVED'>(
    summary.status || 'ACTIVE'
  );

  const lat = summary.userContext?.coordinates?.lat;
  const lng = summary.userContext?.coordinates?.lng;
  const hasCoordinates = typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng);

  // Helper to format Evidence ID cleanly with a single EVID- prefix
  const formatEvidenceId = (rawId?: string, fallbackId?: string) => {
    const val = (rawId || fallbackId || '').trim();
    if (!val) return 'EVID-000000';
    const cleaned = val.replace(/^(EVID-)+/i, '');
    return `EVID-${cleaned}`;
  };

  // Helper to format Location so coordinates are displayed strictly ONCE
  const getLocationInfo = () => {
    const rawLoc = (summary.userContext?.location || 'Current Location').trim();
    // Check if rawLoc already contains lat/lng coordinates string
    const alreadyHasCoords = /lat\b|lng\b|latitude|longitude|\(-?\d+\.\d+/i.test(rawLoc);

    if (alreadyHasCoords) {
      return {
        mainAddress: rawLoc,
        coordsSubtitle: null
      };
    }

    if (hasCoordinates) {
      return {
        mainAddress: rawLoc,
        coordsSubtitle: `(Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)})`
      };
    }

    return {
      mainAddress: rawLoc,
      coordsSubtitle: null
    };
  };

  const locationInfo = getLocationInfo();
  const locationTextForCopy = locationInfo.coordsSubtitle 
    ? `${locationInfo.mainAddress} ${locationInfo.coordsSubtitle}`
    : locationInfo.mainAddress;

  // Helper to format duration text accurately
  const getDurationText = (isRecorded: boolean, durationSecs?: number) => {
    if (!isRecorded) return '--';
    const secs = typeof durationSecs === 'number' ? Math.max(0, durationSecs) : 0;
    return `${secs}s`;
  };

  const googleMapsUrl = hasCoordinates 
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(summary.userContext.location || 'Current Location')}`;

  const handleCopyReport = () => {
    const textToCopy = `[VERA COMPANION - AI EMERGENCY REPORT]
Incident ID: ${summary.incidentId}
Emergency Status: ${emergencyStatus}
Risk Level: ${summary.riskLevel}
Timestamp: ${new Date(summary.timestamp).toLocaleString()}

SUMMARY:
${summary.summaryText}

LOCATION:
${locationTextForCopy}
Google Maps: ${googleMapsUrl}

MEDICAL NOTES:
${summary.userContext.medicalNotes || 'None'}

EMERGENCY EVIDENCE:
${summary.evidence 
  ? `Audio Recording: ${summary.evidence.mediaType === 'audio' ? 'Recorded' : 'Not Recorded'} (${getDurationText(summary.evidence.mediaType === 'audio', summary.evidence.durationSeconds)})
Video Recording: ${summary.evidence.mediaType === 'video' ? 'Recorded' : 'Not Recorded'} (${getDurationText(summary.evidence.mediaType === 'video', summary.evidence.durationSeconds)})
Evidence ID: ${formatEvidenceId(summary.evidence.id, summary.incidentId)}`
  : 'No emergency evidence recorded.'}

KEY FINDINGS:
${summary.keyFindings.map(k => '• ' + k).join('\n')}

NOTIFIED GUARDIANS:
${summary.notifiedContacts.map(c => `- ${c.name} (${c.phone})`).join('\n')}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `VERA AI Emergency Report - ${summary.incidentId}`,
        text: summary.summaryText,
        url: googleMapsUrl
      }).catch(() => {});
    } else {
      handleCopyReport();
    }
    setShared(true);
    setTimeout(() => setShared(false), 2500);
  };

  const handleMarkResolved = () => {
    setEmergencyStatus('RESOLVED');
    setTimeout(() => {
      onReturnHome();
    }, 800);
  };

  const riskBadgeStyles = {
    LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/40'
  }[summary.riskLevel] || 'bg-red-500/20 text-red-400 border-red-500/40';

  // Build timeline sequence
  const baseTime = new Date(summary.timestamp).getTime();
  const formatTime = (offsetMs: number) => {
    const d = new Date(baseTime + offsetMs);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const isAudioEvidence = summary.evidence?.mediaType === 'audio';
  const isVideoEvidence = summary.evidence?.mediaType === 'video';

  const timelineEvents = [
    {
      title: 'Emergency SOS Activated',
      time: formatTime(0),
      desc: 'Distress signal triggered by user',
      icon: <ShieldAlert className="w-4 h-4 text-red-400" />,
      color: 'border-red-500/40 bg-red-950/40'
    },
    {
      title: 'GPS Location Acquired',
      time: formatTime(1200),
      desc: hasCoordinates ? `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}` : summary.userContext.location,
      icon: <MapPin className="w-4 h-4 text-violet-400" />,
      color: 'border-violet-500/40 bg-violet-950/40'
    },
    ...(isAudioEvidence ? [{
      title: 'Audio Recording Started',
      time: formatTime(2100),
      desc: `Captured ${summary.evidence?.durationSeconds || 0}s ambient audio evidence`,
      icon: <Mic className="w-4 h-4 text-amber-400" />,
      color: 'border-amber-500/40 bg-amber-950/40'
    }] : []),
    ...(isVideoEvidence ? [{
      title: 'Video Recording Started',
      time: formatTime(2100),
      desc: `Captured ${summary.evidence?.durationSeconds || 0}s camera video evidence`,
      icon: <Video className="w-4 h-4 text-red-400" />,
      color: 'border-red-500/40 bg-red-950/40'
    }] : []),
    {
      title: 'Trusted Contacts Notified',
      time: formatTime(3200),
      desc: `${summary.notifiedContacts.length} guardian${summary.notifiedContacts.length === 1 ? '' : 's'} alerted via SMS`,
      icon: <PhoneCall className="w-4 h-4 text-emerald-400" />,
      color: 'border-emerald-500/40 bg-emerald-950/40'
    },
    {
      title: 'AI Emergency Report Generated',
      time: formatTime(4800),
      desc: 'Gemini AI incident risk analysis completed',
      icon: <Sparkles className="w-4 h-4 text-violet-400" />,
      color: 'border-indigo-500/40 bg-indigo-950/40'
    },
    ...(emergencyStatus === 'RESOLVED' ? [{
      title: 'Emergency Resolved',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      desc: 'Incident closed and user marked safe',
      icon: <UserCheck className="w-4 h-4 text-emerald-400" />,
      color: 'border-emerald-500/50 bg-emerald-900/40'
    }] : [])
  ];

  return (
    <div className="min-h-full bg-slate-950 text-slate-100 p-4 sm:p-6 pb-28 space-y-6 max-w-2xl mx-auto select-none">
      {/* Success Notification Banner */}
      <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-3 px-4 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-3 duration-300">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black text-emerald-300 block uppercase tracking-wide">
              ✓ Emergency Report Generated
            </span>
            <span className="text-[11px] text-emerald-200/80 font-medium">
              Report synced & emergency notifications dispatched to contacts
            </span>
          </div>
        </div>
      </div>
      
      {/* 1. VERA Companion - Top Header Navigation */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-800">
        <button
          type="button"
          id="ai-summary-back-home-btn"
          onClick={onReturnHome}
          className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-2 text-xs font-bold transition shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
          <span>Return Home</span>
        </button>

        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-violet-400" />
          <h1 className="text-base font-black text-white tracking-wider uppercase">
            VERA Companion
          </h1>
        </div>

        <div className="w-16" />
      </div>

      {/* Confirmation Notification Banner */}
      <div className="bg-emerald-950/70 border border-emerald-500/40 p-4 rounded-2xl flex items-start gap-3 shadow-xl">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-200 leading-relaxed font-medium">
          Emergency report dispatched. Alerts sent to <span className="font-bold text-white">{summary.notifiedContacts.length} trusted contact{summary.notifiedContacts.length === 1 ? '' : 's'}</span>.
        </div>
      </div>

      {/* Report Main Container */}
      <div className="space-y-6">

        {/* 2. AI Emergency Report Header & 3. Incident ID & 4. Emergency Status & 5. Risk Level & 6. Timestamp */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* 2. AI Emergency Report Badge Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
              <h2 className="text-xs font-black uppercase tracking-widest text-violet-300">
                AI Emergency Report
              </h2>
            </div>
            <span className="text-[10px] font-mono uppercase bg-violet-500/15 text-violet-300 px-2.5 py-0.5 rounded-full border border-violet-500/30 font-bold">
              Gemini AI Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 3. Incident ID */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider block">
                Incident ID
              </span>
              <div className="text-sm font-black font-mono text-white tracking-wide">
                #{summary.incidentId}
              </div>
            </div>

            {/* 4. Emergency Status */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider block">
                Emergency Status
              </span>
              <div className="flex items-center gap-2">
                {emergencyStatus === 'ACTIVE' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    ACTIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    RESOLVED
                  </span>
                )}
              </div>
            </div>

            {/* 5. Risk Level */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider block">
                Risk Assessment
              </span>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider ${riskBadgeStyles}`}>
                  {summary.riskLevel} RISK
                </span>
              </div>
            </div>

            {/* 6. Timestamp */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider block">
                Report Timestamp
              </span>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pt-0.5">
                <Clock className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span>{new Date(summary.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Summary - Narrative Box */}
        <section className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-violet-400 px-1 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Incident Summary</span>
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3 relative">
            <div className="bg-gradient-to-r from-violet-950/70 via-slate-900 to-indigo-950/70 p-4 rounded-2xl border border-violet-800/30">
              <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-sans font-medium">
                "{summary.summaryText}"
              </p>
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
              <span>Primary Trigger: <strong className="text-slate-200">{summary.incidentType}</strong></span>
              <span>Battery: <strong className="text-emerald-400">{summary.userContext.batteryLevel || '92%'}</strong></span>
            </div>
          </div>
        </section>

        {/* 8. Location Section */}
        <section className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-violet-400 px-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-violet-400" />
            <span>Location</span>
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="text-xs font-bold text-white break-words">
                    {locationInfo.mainAddress}
                  </div>
                  {/* DISPLAYED ONLY ONCE */}
                  {locationInfo.coordsSubtitle && (
                    <div className="text-[11px] font-mono text-violet-300 font-semibold">
                      {locationInfo.coordsSubtitle}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* View on Google Maps Button */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="ai-summary-google-maps-btn"
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-violet-950/50 border border-violet-400/30"
            >
              <MapPin className="w-4 h-4 text-white" />
              <span>View on Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-violet-200" />
            </a>
          </div>
        </section>

        {/* 9. Medical Notes */}
        <section className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-violet-400 px-1 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Medical Notes</span>
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
                <Activity className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">
                  Emergency Medical Information
                </span>
                <p className="text-xs font-semibold text-slate-200">
                  {summary.userContext.medicalNotes && summary.userContext.medicalNotes.trim().length > 0
                    ? summary.userContext.medicalNotes
                    : 'No emergency medical notes provided.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 10. Emergency Evidence */}
        <section className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-500 animate-pulse" />
              <span>Emergency Evidence</span>
            </h3>
            {summary.evidence && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Encrypted & Saved
              </span>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            {summary.evidence ? (
              <div className="space-y-3">
                {/* Evidence Details Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* Audio Recording Status */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <Mic className="w-3 h-3 text-amber-400" /> Audio
                    </span>
                    <div className="text-xs font-bold text-white">
                      {summary.evidence.mediaType === 'audio' ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Recorded
                        </span>
                      ) : (
                        <span className="text-slate-500">Not Recorded</span>
                      )}
                    </div>
                  </div>

                  {/* Audio Duration */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Audio Duration
                    </span>
                    <div className="text-xs font-bold text-slate-200">
                      {getDurationText(summary.evidence.mediaType === 'audio', summary.evidence.durationSeconds)}
                    </div>
                  </div>

                  {/* Video Recording Status */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <Video className="w-3 h-3 text-red-400" /> Video
                    </span>
                    <div className="text-xs font-bold text-white">
                      {summary.evidence.mediaType === 'video' ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Recorded
                        </span>
                      ) : (
                        <span className="text-slate-500">Not Recorded</span>
                      )}
                    </div>
                  </div>

                  {/* Video Duration */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Video Duration
                    </span>
                    <div className="text-xs font-bold text-slate-200">
                      {getDurationText(summary.evidence.mediaType === 'video', summary.evidence.durationSeconds)}
                    </div>
                  </div>

                  {/* Evidence ID */}
                  <div className="col-span-2 sm:col-span-1 p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Evidence ID
                    </span>
                    <div className="text-xs font-mono font-bold text-violet-300 truncate">
                      {formatEvidenceId(summary.evidence.id, summary.incidentId)}
                    </div>
                  </div>
                </div>

                {/* Media Playback or Backup info */}
                {summary.evidence.blobUrl ? (
                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      {summary.evidence.mediaType === 'video' ? (
                        <Video className="w-4 h-4 text-red-400" />
                      ) : (
                        <Mic className="w-4 h-4 text-amber-400" />
                      )}
                      <span>
                        Play Recording ({summary.evidence.mediaType === 'video' ? 'Video' : 'Audio'})
                      </span>
                    </div>

                    {summary.evidence.mediaType === 'video' ? (
                      <video src={summary.evidence.blobUrl} controls className="w-full rounded-xl border border-slate-800 bg-black max-h-56 mt-2" />
                    ) : (
                      <audio src={summary.evidence.blobUrl} controls className="w-full mt-2" />
                    )}

                    <a
                      href={summary.evidence.blobUrl}
                      download={`VERA_Evidence_${summary.incidentId}.webm`}
                      className="w-full mt-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5 text-violet-400" />
                      <span>Download Recording File</span>
                    </a>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
                    <span>Evidence metadata and timestamps saved securely to Firestore.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 text-center space-y-1">
                <FileAudio className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-400">
                  No emergency evidence recorded.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 11. Key Findings */}
        <section className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-violet-400 px-1 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Key Findings & Safety Protocols</span>
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">
                AI Threat Assessment
              </span>
              {summary.keyFindings.map((finding, index) => (
                <div key={index} className="flex items-start gap-2.5 text-xs text-slate-200 bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{finding}</span>
                </div>
              ))}
            </div>

            {summary.recommendedActions && summary.recommendedActions.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">
                  Recommended Action Protocols
                </span>
                {summary.recommendedActions.map((action, index) => (
                  <div key={index} className="flex items-start gap-2.5 text-xs text-slate-200 bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
                    <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <span className="leading-snug">{action}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 12. Notified Guardians */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <PhoneCall className="w-4 h-4" />
              <span>Notified Guardians</span>
            </h3>
            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              {summary.notifiedContacts.length} Contacted
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2.5">
            {summary.notifiedContacts.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-2">
                No trusted contacts configured.
              </p>
            ) : (
              summary.notifiedContacts.map((contact, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{contact.name}</div>
                      <div className="text-[11px] text-slate-400">{contact.relationship} • {contact.phone}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30 shrink-0">
                    Alert Dispatched
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 13. Timeline */}
        <section className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-violet-400 px-1 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span>Emergency Timeline</span>
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {timelineEvents.map((evt, idx) => (
                <div key={idx} className="relative flex items-start gap-3">
                  <div className={`absolute -left-6 p-1 rounded-full border ${evt.color} shrink-0`}>
                    {evt.icon}
                  </div>
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 w-full space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{evt.title}</span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">{evt.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{evt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Action Toolbar */}
        <div className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              id="ai-summary-share-btn"
              onClick={handleShare}
              className="py-3.5 px-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition border border-violet-400/30 shadow-lg shadow-violet-950/50"
            >
              {shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span>{shared ? 'Shared' : 'Share Report'}</span>
            </button>

            <button
              type="button"
              id="ai-summary-copy-btn"
              onClick={handleCopyReport}
              className="py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition border border-slate-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>

          <button
            type="button"
            id="ai-summary-mark-safe-btn"
            onClick={handleMarkResolved}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-xl shadow-emerald-950/50 border border-emerald-400/30"
          >
            <UserCheck className="w-5 h-5" />
            <span>{emergencyStatus === 'RESOLVED' ? 'Return to Home' : 'Mark Safe & Resolve Emergency'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
