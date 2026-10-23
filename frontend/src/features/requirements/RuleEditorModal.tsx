import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { ChecklistRule, SeverityLevel, RuleType } from '../../types';

interface RuleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ruleData: Partial<ChecklistRule>) => Promise<void>;
  rule?: ChecklistRule | null;
}

const CANONICAL_FIELD_OPTIONS = [
  { key: 'udi_di', label: 'udi_di (UDI Device Identifier)' },
  { key: 'udi_pi', label: 'udi_pi (UDI Production Identifier)' },
  { key: 'model_ref', label: 'model_ref (REF / Model Number)' },
  { key: 'lot_batch', label: 'lot_batch (LOT / Batch Number)' },
  { key: 'serial_number', label: 'serial_number (Serial Number)' },
  { key: 'manufacturer_name', label: 'manufacturer_name (Legal Manufacturer)' },
  { key: 'manufacturer_address', label: 'manufacturer_address (Registered Address)' },
  { key: 'country_of_origin', label: 'country_of_origin (Country of Origin)' },
  { key: 'expiration_date', label: 'expiration_date (Expiration Date)' },
  { key: 'manufacturing_date', label: 'manufacturing_date (Manufacturing Date)' },
  { key: 'ce_mark', label: 'ce_mark (CE Mark Conformity)' },
  { key: 'notified_body_id', label: 'notified_body_id (4-Digit Notified Body)' },
  { key: 'rx_only', label: 'rx_only (Prescription Statement / Symbol)' },
  { key: 'single_use', label: 'single_use (Do Not Reuse / Single Use)' },
  { key: 'sterile', label: 'sterile (Sterile State / Method)' },
  { key: 'warnings', label: 'warnings (Safety Warnings & Precautions)' },
  { key: 'contraindications', label: 'contraindications (Contraindications)' },
  { key: 'storage_conditions', label: 'storage_conditions (Storage Instructions)' },
];

export const RuleEditorModal: React.FC<RuleEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  rule,
}) => {
  const [ruleKey, setRuleKey] = useState('');
  const [fieldKey, setFieldKey] = useState('udi_di');
  const [customField, setCustomField] = useState(false);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('Major');
  const [ruleType, setRuleType] = useState<RuleType>('REQUIRED_PRESENCE');
  const [expectedValue, setExpectedValue] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rule) {
      setRuleKey(rule.rule_key);
      const isCanonical = CANONICAL_FIELD_OPTIONS.some((o) => o.key === rule.field_key);
      if (isCanonical) {
        setFieldKey(rule.field_key);
        setCustomField(false);
      } else {
        setFieldKey(rule.field_key);
        setCustomField(true);
      }
      setDescription(rule.description);
      setSeverity(rule.severity);
      setRuleType(rule.rule_type);
      setExpectedValue(rule.expected_value || '');
      setEnabled(rule.enabled);
    } else {
      setRuleKey('');
      setFieldKey('udi_di');
      setCustomField(false);
      setDescription('');
      setSeverity('Major');
      setRuleType('REQUIRED_PRESENCE');
      setExpectedValue('');
      setEnabled(true);
    }
    setError(null);
  }, [rule, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleKey.trim() || !fieldKey.trim() || !description.trim()) {
      setError('Rule key, target field, and description are required.');
      return;
    }

    if (ruleType === 'FORMAT_REGEX') {
      if (!expectedValue.trim()) {
        setError('Expected value regex pattern is required for FORMAT_REGEX rule type.');
        return;
      }
      try {
        new RegExp(expectedValue);
      } catch (err: any) {
        setError(`Invalid regular expression: ${err.message}`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      await onSave({
        rule_key: ruleKey.trim().toUpperCase(),
        field_key: fieldKey.trim().toLowerCase(),
        description: description.trim(),
        severity,
        rule_type: ruleType,
        expected_value: expectedValue.trim() || undefined,
        enabled,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1E293B] border border-slate-700/80 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-900/40">
          <div>
            <h3 className="text-base font-semibold text-white">
              {rule ? 'Edit Compliance Rule' : 'Add Compliance Rule'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic verification rule evaluated against extracted PDF entities.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Rule Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Rule Identifier Key <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={ruleKey}
              onChange={(e) => setRuleKey(e.target.value.toUpperCase())}
              placeholder="e.g. FDA_UDI_DI_REQUIRED"
              disabled={!!rule} // rule_key immutable when editing
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 disabled:opacity-60"
            />
          </div>

          {/* Field Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Target Extracted Field <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setCustomField(!customField)}
                className="text-[11px] text-sky-400 hover:text-sky-300 underline"
              >
                {customField ? 'Select standard field' : 'Custom field key'}
              </button>
            </div>
            {customField ? (
              <input
                type="text"
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value.toLowerCase())}
                placeholder="e.g. custom_property_name"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            ) : (
              <select
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
              >
                {CANONICAL_FIELD_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Rule Description & Regulatory Basis <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Unique Device Identifier (UDI) Device Identifier must be present on label under 21 CFR 801.20."
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Severity Radio */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Severity Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Critical', 'Major', 'Minor'] as SeverityLevel[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition ${
                    severity === s
                      ? s === 'Critical'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : s === 'Major'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-sky-500/20 border-sky-500 text-sky-300'
                      : 'bg-slate-900/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Rule Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Validation Type
            </label>
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as RuleType)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
            >
              <option value="REQUIRED_PRESENCE">REQUIRED_PRESENCE — Field must be present and extracted</option>
              <option value="FORMAT_REGEX">FORMAT_REGEX — Value must match regular expression</option>
              <option value="VALUE_MATCH">VALUE_MATCH — Value must match exact text</option>
              <option value="DATE_EXPIRATION">DATE_EXPIRATION — Expiry must be ISO and unexpired</option>
              <option value="CROSS_FIELD_MATCH">CROSS_FIELD_MATCH — Relational check between fields</option>
            </select>
          </div>

          {/* Expected Value */}
          {(ruleType === 'FORMAT_REGEX' || ruleType === 'VALUE_MATCH') && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {ruleType === 'FORMAT_REGEX' ? 'Regular Expression Pattern' : 'Expected String Value'}{' '}
                <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={expectedValue}
                onChange={(e) => setExpectedValue(e.target.value)}
                placeholder={ruleType === 'FORMAT_REGEX' ? '^\\d{4}-\\d{2}-\\d{2}$' : 'e.g. Rx Only'}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Enabled toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="rule_enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0 focus:ring-offset-0"
            />
            <label htmlFor="rule_enabled" className="text-xs text-slate-300 select-none">
              Rule is active and enabled for evaluation
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : rule ? 'Update Rule' : 'Add Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
