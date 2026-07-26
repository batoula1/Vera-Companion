import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  History, 
  Clock, 
  Footprints, 
  ShieldAlert, 
  PhoneCall, 
  Sparkles, 
  ChevronRight, 
  FileText, 
  CheckCircle2, 
  Calendar, 
  Layers,
  Trash2
} from 'lucide-react';
import { AISummaryReport, ScreenType } from '../types';

interface HistoryScreenProps {
  latestSummary: AISummaryReport | null;
  onNavigate: (screen: ScreenType) => void;
  onBack: () => void;
}

interface ActivityLogItem {
  id: string;
  type: 'emergency' | 'checkin' | 'safewalk' | 'fakecall';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  latestSummary,
  onNavigate,
  onBack
}) => {
  const [filter, setFilter] = useState<'all' | 'emergency' | 'checkin' | 'safewalk' | 'fakecall'>('all');
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);

  useEffect(() => {
    const items: ActivityLogItem[] = [];

    if (latestSummary) {
      items.push({
        id: `summary-${latestSummary.incidentId}`,
        type: 'emergency',
        title: `AI Emergency Report #${latestSummary.incidentId}`,
        description: latestSummary.summaryText.length > 90 ? latestSummary.summaryText.substring(0, 90) + '...' : latestSummary.summaryText,
        timestamp: latestSummary.timestamp,
        status: latestSummary.status || 'ACTIVE'
      });
    }

    try {
      const stored = localStorage.getItem('vera_activity_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((p, idx) => {
            items.push({
              id: `log-${idx}-${p.title}`,
              type: p.type || 'checkin',
              title: p.title || 'Safety Event',
              description: p.description || '',
              timestamp: p.time || new Date().toISOString()
            });
          });
        }
      }
    } catch (e) {
      // ignore
    }

    setLogs(items);
  }, [latestSummary]);

  const filteredLogs = logs.filter(item => filter === 'all' || item.type === filter);

  const handleClearLogs = () => {
    localStorage.removeItem('vera_activity_history');
    setLogs(latestSummary ? [{
      id: `summary-${latestSummary.incidentId}`,
      type: 'emergency',
      title: `AI Emergency Report #${latestSummary.incidentId}`,
      description: latestSummary.summaryText,
      timestamp: latestSummary.timestamp,
      status: latestSummary.status || 'ACTIVE'
    }] : []);
  };

  return (
    <div className="min-h-full bg-slate-950 text-slate-100 p-4 sm:p-6 pb-28 space-y-6 max-w-2xl mx-auto select-none">
      
      {/* Top Header */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-800">
        <button
          type="button"
          id="history-back-btn"
          onClick={onBack}
          className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-2 text-xs font-bold transition shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
          <span>Return</span>
        </button>

        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-violet-400" />
          <h1 className="text-base font-black text-white tracking-wider uppercase">
            Activity History
          </h1>
        </div>

        <div className="w-16" />
      </div>

      {/* Latest AI Emergency Report Card Banner */}
      {latestSummary && (
        <div className="bg-gradient-to-br from-violet-900 via-slate-900 to-indigo-950 border border-violet-700/50 rounded-3xl p-5 shadow-2xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
              <span className="text-xs font-black uppercase text-violet-300">Latest AI Report</span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-violet-500/20 text-violet-200 px-2.5 py-0.5 rounded-full border border-violet-400/30 font-bold">
              #{latestSummary.incidentId}
            </span>
          </div>

          <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
            "{latestSummary.summaryText}"
          </p>

          <button
            type="button"
            id="history-open-report-btn"
            onClick={() => onNavigate('ai_summary')}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg transition border border-violet-400/30"
          >
            <span>View Full AI Emergency Report</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'all', label: 'All Activity' },
          { key: 'emergency', label: 'SOS Reports' },
          { key: 'checkin', label: 'Check-Ins' },
          { key: 'safewalk', label: 'Safe Walks' },
          { key: 'fakecall', label: 'Fake Calls' }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key as any)}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
              filter === tab.key
                ? 'bg-violet-600 border-violet-500 text-white shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History Items List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center space-y-2 bg-slate-950/60 rounded-2xl border border-slate-800/80">
            <Layers className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-400">
              No activity logs recorded for this filter.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((item) => (
              <div key={item.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 shrink-0">
                      {item.type === 'emergency' && <ShieldAlert className="w-4 h-4 text-red-400" />}
                      {item.type === 'checkin' && <Clock className="w-4 h-4 text-violet-400" />}
                      {item.type === 'safewalk' && <Footprints className="w-4 h-4 text-cyan-400" />}
                      {item.type === 'fakecall' && <PhoneCall className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{item.description}</p>
                    </div>
                  </div>

                  {item.type === 'emergency' && latestSummary && (
                    <button
                      type="button"
                      onClick={() => onNavigate('ai_summary')}
                      className="text-[10px] font-bold text-violet-300 bg-violet-500/20 px-2.5 py-1 rounded-full border border-violet-400/30 shrink-0"
                    >
                      View Report
                    </button>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-900 pt-2">
                  <span>Timestamp: {new Date(item.timestamp).toLocaleString()}</span>
                  {item.status && <span className="text-emerald-400 font-bold uppercase">{item.status}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {logs.length > 0 && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleClearLogs}
              className="text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-1 font-bold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Activity Log</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
