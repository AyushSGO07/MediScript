import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, RefreshCw, Loader2, GitCompare, Edit3 } from 'lucide-react';
import { ExtractedField, ReviewFieldsResponse } from '../../types';
import { api } from '../../lib/api';
import { EntityConfidenceBadge } from './EntityConfidenceBadge';
import { FieldOverrideModal } from './FieldOverrideModal';

interface ReviewEntitiesComparisonViewProps {
  reviewId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ReviewEntitiesComparisonView: React.FC<ReviewEntitiesComparisonViewProps> = ({
  reviewId,
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<ReviewFieldsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingField, setEditingField] = useState<ExtractedField | null>(null);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const res = await api.getReviewFields(reviewId);
      setData(res);
    } catch (err) {
      console.error('Failed to load review fields:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFields();
    }
  }, [isOpen, reviewId]);

  if (!isOpen) return null;

  // Build key-indexed lookup
  const baselineMap = new Map<string, ExtractedField>();
  const revisedMap = new Map<string, ExtractedField>();

  data?.baseline_fields.forEach((f) => baselineMap.set(f.field_key, f));
  data?.revised_fields.forEach((f) => revisedMap.set(f.field_key, f));

  // Collect all unique keys
  const allKeys = Array.from(new Set([...Array.from(baselineMap.keys()), ...Array.from(revisedMap.keys())]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0F172A] border border-slate-700/80 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-700/80 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Comparative Medical Entity Analysis</h3>
              <p className="text-[11px] text-slate-400">
                Direct side-by-side parameter alignment between Approved Baseline and Revised Candidate labels
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchFields}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Refresh extracted fields"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 select-none">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
              <p className="text-xs text-slate-400 font-mono">Loading extracted parameters...</p>
            </div>
          ) : allKeys.length > 0 ? (
            <div className="border border-slate-700/80 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 font-mono text-[10px] uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-1/4 font-semibold">Entity Parameter</th>
                    <th className="py-3 px-4 w-[35%] font-semibold text-sky-400">Approved Baseline Label</th>
                    <th className="py-3 px-4 w-[35%] font-semibold text-teal-400">Revised Candidate Label</th>
                    <th className="py-3 px-3 w-16 text-center font-semibold">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {allKeys.map((key) => {
                    const base = baselineMap.get(key);
                    const rev = revisedMap.get(key);
                    const label = base?.field_label || rev?.field_label || key;

                    const baseVal = base?.value?.trim() || '';
                    const revVal = rev?.value?.trim() || '';
                    const isDifferent = baseVal !== '' && revVal !== '' && baseVal !== revVal;
                    const isMissingInRevised = baseVal !== '' && revVal === '';
                    const isNewInRevised = baseVal === '' && revVal !== '';

                    return (
                      <tr
                        key={key}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isDifferent
                            ? 'bg-sky-950/15'
                            : isMissingInRevised
                            ? 'bg-rose-950/15'
                            : ''
                        }`}
                      >
                        {/* Parameter Label */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{label}</div>
                          <div className="font-mono text-[10px] text-slate-500">{key}</div>
                        </td>

                        {/* Baseline Value */}
                        <td className="py-3 px-4">
                          {base ? (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1.5 font-mono text-[11px] text-slate-100">
                                <span>{base.value || '(None)'}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-[10px]">
                                <EntityConfidenceBadge state={base.confidence_state} size="sm" />
                                {base.evidence_page && (
                                  <span className="text-slate-500 font-mono">P.{base.evidence_page}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600 italic">No baseline document</span>
                          )}
                        </td>

                        {/* Revised Value */}
                        <td className="py-3 px-4">
                          {rev ? (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1.5 font-mono text-[11px] text-slate-100">
                                <span>{rev.value || '(None)'}</span>
                                <button
                                  onClick={() => setEditingField(rev)}
                                  className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-teal-400"
                                  title="Edit/Override Revised Parameter"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex items-center space-x-2 text-[10px]">
                                <EntityConfidenceBadge state={rev.confidence_state} size="sm" />
                                {rev.evidence_page && (
                                  <span className="text-slate-500 font-mono">P.{rev.evidence_page}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600 italic">No revised document</span>
                          )}
                        </td>

                        {/* Diff Indicator */}
                        <td className="py-3 px-3 text-center">
                          {isDifferent && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              DELTA
                            </span>
                          )}
                          {isMissingInRevised && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              REMOVED
                            </span>
                          )}
                          {isNewInRevised && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              NEW
                            </span>
                          )}
                          {!isDifferent && !isMissingInRevised && !isNewInRevised && (
                            <span className="text-slate-600 font-mono text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-xs">No extracted entities found for this review.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload baseline and revised label PDFs to automatically extract parameters.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            {allKeys.length} regulatory parameters evaluated
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {editingField && (
        <FieldOverrideModal
          field={editingField}
          isOpen={!!editingField}
          onClose={() => setEditingField(null)}
          onFieldUpdated={() => {
            setEditingField(null);
            fetchFields();
          }}
        />
      )}
    </div>
  );
};
