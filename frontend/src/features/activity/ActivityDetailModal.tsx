import React, { useState } from 'react';
import {
  X,
  Code,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  User,
  Layers,
} from 'lucide-react';
import { ActivityEvent } from '../../types';

interface ActivityDetailModalProps {
  isOpen: boolean;
  event: ActivityEvent | null;
  onClose: () => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  isOpen,
  event,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !event) return null;

  const jsonString = JSON.stringify(
    {
      id: event.id,
      event_type: event.event_type,
      actor: event.actor,
      created_at: event.created_at,
      project_id: event.project_id,
      review_id: event.review_id,
      workspace_id: event.workspace_id,
      details: event.details,
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Code className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                Audit Event Payload
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs text-indigo-300 font-semibold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60">
                  {event.event_type}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ID: {event.id.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata summary strip */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-400">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate">{event.actor}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-[11px] truncate">
              {new Date(event.created_at).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-400 col-span-2 sm:col-span-1">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-[11px] truncate">
              {event.review_id ? `Review: ${event.review_id.slice(0, 8)}` : 'Global'}
            </span>
          </div>
        </div>

        {/* JSON Code Viewer */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 font-mono text-xs text-emerald-300 leading-relaxed">
          <pre className="whitespace-pre-wrap break-all">{jsonString}</pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Append-Only Immutable Record
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
