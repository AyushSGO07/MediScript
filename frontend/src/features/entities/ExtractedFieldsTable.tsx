import React, { useState } from 'react';
import { Eye, Edit3, Calendar, Hash, ShieldCheck, Factory, AlertTriangle } from 'lucide-react';
import { ExtractedField } from '../../types';
import { EntityConfidenceBadge } from './EntityConfidenceBadge';
import { FieldOverrideModal } from './FieldOverrideModal';

interface ExtractedFieldsTableProps {
  fields: ExtractedField[];
  onInspectEvidence?: (field: ExtractedField) => void;
  onFieldUpdated?: () => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  identifiers: Hash,
  dates: Calendar,
  regulatory: ShieldCheck,
  manufacturer: Factory,
  safety: AlertTriangle,
};

const CATEGORY_TITLES: Record<string, string> = {
  identifiers: 'Device Identifiers & Traceability',
  dates: 'Expiration & Manufacturing Dates',
  regulatory: 'Regulatory Marks & Medical Symbols',
  manufacturer: 'Legal Manufacturer & Origin',
  safety: 'Safety Statements, Warnings & Handling',
};

export const ExtractedFieldsTable: React.FC<ExtractedFieldsTableProps> = ({
  fields,
  onInspectEvidence,
  onFieldUpdated,
}) => {
  const [editingField, setEditingField] = useState<ExtractedField | null>(null);

  // Group fields by category
  const categories = ['identifiers', 'dates', 'regulatory', 'manufacturer', 'safety'];

  const getFieldsByCategory = (cat: string) => fields.filter((f) => f.category === cat);

  return (
    <div className="space-y-6 text-xs select-none">
      {categories.map((cat) => {
        const catFields = getFieldsByCategory(cat);
        if (catFields.length === 0) return null;
        const Icon = CATEGORY_ICONS[cat] || Hash;
        const title = CATEGORY_TITLES[cat] || cat;

        return (
          <div key={cat} className="bg-slate-900/70 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
            {/* Category Section Header */}
            <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/80 flex items-center space-x-2 text-slate-200 font-semibold">
              <Icon className="w-4 h-4 text-sky-400" />
              <span>{title}</span>
              <span className="text-[10px] font-mono text-slate-400 ml-auto">
                {catFields.length} {catFields.length === 1 ? 'parameter' : 'parameters'}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950/40 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Label Field</th>
                    <th className="py-2.5 px-4 font-semibold">Extracted Value</th>
                    <th className="py-2.5 px-4 font-semibold">Confidence State</th>
                    <th className="py-2.5 px-4 font-semibold">Evidence Citation</th>
                    <th className="py-2.5 px-4 font-semibold">Provenance</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {catFields.map((field) => (
                    <tr key={field.id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Field name */}
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-200">{field.field_label}</div>
                        <div className="font-mono text-[10px] text-slate-500">{field.field_key}</div>
                      </td>

                      {/* Extracted value */}
                      <td className="py-2.5 px-4 max-w-xs truncate">
                        {field.value ? (
                          <div className="flex items-center space-x-1.5 font-mono text-[11px] text-white">
                            <span className="truncate">{field.value}</span>
                            {field.is_expired && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                Expired
                              </span>
                            )}
                            {field.is_iso_compliant === false && field.category === 'dates' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Non-ISO
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Not Detected</span>
                        )}
                      </td>

                      {/* 4-state confidence */}
                      <td className="py-2.5 px-4">
                        <EntityConfidenceBadge state={field.confidence_state} size="sm" />
                      </td>

                      {/* Evidence Link */}
                      <td className="py-2.5 px-4">
                        {field.evidence_page ? (
                          <button
                            type="button"
                            onClick={() => onInspectEvidence?.(field)}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 transition-colors"
                            title={`Inspect snippet: "${field.evidence_text || ''}"`}
                          >
                            <Eye className="w-3 h-3 text-sky-400" />
                            <span>Page {field.evidence_page}</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 font-mono text-[10px]">—</span>
                        )}
                      </td>

                      {/* Provenance */}
                      <td className="py-2.5 px-4 text-[11px]">
                        {field.is_overridden ? (
                          <div className="flex items-center space-x-1 text-amber-300 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span title={`Rationale: ${field.override_reason || ''} (by ${field.reviewed_by || 'Reviewer'})`}>
                              Overridden
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Auto-Extracted</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {field.evidence_page && onInspectEvidence && (
                            <button
                              type="button"
                              onClick={() => onInspectEvidence(field)}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-400 transition-colors"
                              title="Jump to Visual PDF Coordinate Highlight"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingField(field)}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                            title="Perform Human-in-the-Loop Override"
                          >
                            <Edit3 className="w-3 h-3 text-teal-400" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {editingField && (
        <FieldOverrideModal
          field={editingField}
          isOpen={!!editingField}
          onClose={() => setEditingField(null)}
          onFieldUpdated={() => {
            setEditingField(null);
            onFieldUpdated?.();
          }}
        />
      )}
    </div>
  );
};
