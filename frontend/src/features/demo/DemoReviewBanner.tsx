import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, AlertCircle, Loader2, Play } from 'lucide-react';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';

export const DemoReviewBanner: React.FC = () => {
  const { setSelectedReviewId, refreshData } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLaunchDemo = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.loadDemoReview();
      await refreshData();
      if (res.review_id) {
        setSelectedReviewId(res.review_id);
      }
    } catch (err: any) {
      console.error('Failed to launch demo review:', err);
      setError(err.message || 'Failed to initialize demonstration showcase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900/95 to-teal-950/70 border border-indigo-500/30 p-6 shadow-xl">
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold font-mono">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Interactive Audit Showcase • CardioVasc™ Everolimus Stent</span>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">
            1-Click Synthetic Medical Label Audit Showcase
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed">
            Instantly provision a complete regulatory review session comparing an approved baseline against a revised label artwork with deliberate non-compliances: <span className="text-rose-300 font-medium">invalid date format (12/31/2028)</span>, <span className="text-amber-300 font-medium">storage temperature excursion (15°C–25°C)</span>, and <span className="text-purple-300 font-medium">truncated UDI check digit</span> evaluated against FDA 21 CFR 801/830.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-800/80 text-emerald-400 border border-slate-700/80 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> 100% Deterministic Offline
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 text-teal-300 border border-slate-700/80">
              Grounded AI Copilot
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 text-sky-300 border border-slate-700/80">
              Exact [p. X, block Y] Evidence
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 text-indigo-300 border border-slate-700/80">
              ReportLab Audit PDF Export
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 px-3 py-1.5 rounded-lg mt-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
          <button
            onClick={handleLaunchDemo}
            disabled={loading}
            className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Provisioning CardioVasc Review...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Launch Demo Review</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <span className="text-[10px] text-slate-400 text-center font-mono">
            No file upload or API keys required
          </span>
        </div>
      </div>
    </div>
  );
};
