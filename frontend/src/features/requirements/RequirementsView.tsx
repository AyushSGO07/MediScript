import React, { useState, useEffect } from 'react';
import {
  ListChecks,
  Plus,
  Upload,
  Download,
  GitBranch,
  Lock,
  Unlock,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Pencil,
  FileCode,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  Checklist,
  ChecklistVersion,
  ChecklistRule,
} from '../../types';
import { CreateChecklistModal } from './CreateChecklistModal';
import { UploadChecklistModal } from './UploadChecklistModal';
import { NewVersionModal } from './NewVersionModal';
import { RuleEditorModal } from './RuleEditorModal';

export const RequirementsView: React.FC = () => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<ChecklistVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [ruleTypeFilter, setRuleTypeFilter] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ChecklistRule | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  // Load checklists
  const loadChecklists = async (keepSelectedId?: string, targetVersionId?: string) => {
    try {
      setLoading(true);
      const list = await api.getChecklists();
      setChecklists(list);

      const targetId = keepSelectedId || selectedChecklistId || list[0]?.id;
      if (targetId) {
        setSelectedChecklistId(targetId);
        const detail = await api.getChecklist(targetId);
        if (detail.versions && detail.versions.length > 0) {
          const vToLoad = targetVersionId
            ? detail.versions.find((v) => v.id === targetVersionId) || detail.versions[0]
            : detail.versions[0];
          const vDetail = await api.getVersion(vToLoad.id);
          setSelectedVersion(vDetail);
        } else {
          setSelectedVersion(null);
        }
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load checklists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklists();
  }, []);

  const handleSelectChecklist = async (chkId: string) => {
    setSelectedChecklistId(chkId);
    try {
      const detail = await api.getChecklist(chkId);
      if (detail.versions && detail.versions.length > 0) {
        const vDetail = await api.getVersion(detail.versions[0].id);
        setSelectedVersion(vDetail);
      } else {
        setSelectedVersion(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load checklist details');
    }
  };

  const handleSelectVersion = async (versionId: string) => {
    try {
      const vDetail = await api.getVersion(versionId);
      setSelectedVersion(vDetail);
    } catch (err: any) {
      setError(err.message || 'Failed to load version details');
    }
  };

  const handlePublishVersion = async () => {
    if (!selectedVersion) return;
    if (
      !confirm(
        `Are you sure you want to publish version ${selectedVersion.version}? Once published, rules are permanently locked to guarantee audit reproducibility.`
      )
    )
      return;

    try {
      await api.publishVersion(selectedVersion.id);
      await loadChecklists(selectedChecklistId || undefined, selectedVersion.id);
    } catch (err: any) {
      alert(err.message || 'Failed to publish version');
    }
  };

  const handleToggleRuleEnabled = async (rule: ChecklistRule) => {
    if (selectedVersion?.is_locked) {
      alert('Cannot modify an immutable published version. Clone a new version to edit.');
      return;
    }
    try {
      await api.updateRule(rule.id, { enabled: !rule.enabled });
      if (selectedVersion) {
        const updatedV = await api.getVersion(selectedVersion.id);
        setSelectedVersion(updatedV);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to toggle rule state');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (selectedVersion?.is_locked) {
      alert('Cannot delete rules from an immutable published version.');
      return;
    }
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await api.deleteRule(ruleId);
      if (selectedVersion) {
        const updatedV = await api.getVersion(selectedVersion.id);
        setSelectedVersion(updatedV);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete rule');
    }
  };

  const handleSaveRule = async (ruleData: Partial<ChecklistRule>) => {
    if (!selectedVersion) return;
    if (editingRule) {
      await api.updateRule(editingRule.id, ruleData);
    } else {
      await api.addRule(selectedVersion.id, ruleData);
    }
    const updatedV = await api.getVersion(selectedVersion.id);
    setSelectedVersion(updatedV);
  };

  const handleCloneVersion = async (data: {
    version: string;
    clone_from_version_id?: string;
    effective_date?: string;
    changelog_summary?: string;
  }) => {
    if (!selectedChecklistId) return;
    const newV = await api.createVersion(selectedChecklistId, data);
    await loadChecklists(selectedChecklistId, newV.id);
  };

  const handleCreateChecklist = async (data: {
    name: string;
    jurisdiction: string;
    source_reference?: string;
    description?: string;
    initial_version?: string;
  }) => {
    const created = await api.createChecklist(data);
    await loadChecklists(created.id);
    return created;
  };

  const handleUploadChecklist = async (file: File, targetId?: string) => {
    const res = await api.uploadChecklist(file, targetId);
    await loadChecklists(res.id);
    return res;
  };

  // Active Checklist
  const activeChecklist = checklists.find((c) => c.id === selectedChecklistId);

  // Filtered Rules
  const rules = selectedVersion?.rules || [];
  const filteredRules = rules.filter((r) => {
    if (severityFilter !== 'ALL' && r.severity !== severityFilter) return false;
    if (ruleTypeFilter !== 'ALL' && r.rule_type !== ruleTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.rule_key.toLowerCase().includes(q) ||
        r.field_key.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.expected_value && r.expected_value.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const criticalCount = rules.filter((r) => r.severity === 'Critical').length;
  const majorCount = rules.filter((r) => r.severity === 'Major').length;
  const minorCount = rules.filter((r) => r.severity === 'Minor').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Requirements & Checklists
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Version-controlled compliance rules across global regulatory jurisdictions.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Download Template Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-semibold text-slate-200 transition">
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#1E293B] border border-slate-700/80 rounded-lg shadow-xl overflow-hidden py-1 z-20 hidden group-hover:block animate-fade-in">
              <a
                href={api.getTemplateUrl('csv')}
                download="mediscript_template.csv"
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <FileCode className="w-3.5 h-3.5 text-teal-400" />
                <span>CSV Template (.csv)</span>
              </a>
              <a
                href={api.getTemplateUrl('json')}
                download="mediscript_template.json"
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                <span>JSON Schema (.json)</span>
              </a>
            </div>
          </div>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-semibold text-slate-200 transition"
          >
            <Upload className="w-3.5 h-3.5 text-teal-400" />
            <span>Import CSV/JSON</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Checklist</span>
          </button>
        </div>
      </div>

      {/* Prominent Demonstration Disclaimer Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs leading-relaxed">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-200">Demonstration Regulatory References:</span> Pre-seeded checklists (FDA 21 CFR 801/830, EU MDR 2017/745, and ISO 20417) are demonstration models designed for prototype verification and testing. They do not constitute certified legal interpretations or complete regulatory checklists. In production settings, verify all labeling requirements against official FDA/EU MDR publications.
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-slate-400 text-xs text-center animate-pulse">
          Loading regulatory checklists and version repositories...
        </div>
      )}

      {/* Checklist Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {checklists.map((chk) => {
          const isSelected = chk.id === selectedChecklistId;
          return (
            <button
              key={chk.id}
              onClick={() => handleSelectChecklist(chk.id)}
              className={`text-left p-4 rounded-xl border transition flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800/90 border-sky-500/60 shadow-lg shadow-sky-500/5 ring-1 ring-sky-500/30'
                  : 'bg-[#1E293B]/70 border-slate-700/60 hover:bg-slate-800/60 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-sky-500/10 border border-sky-500/20 text-sky-400">
                    <Globe className="w-3 h-3" />
                    {chk.jurisdiction}
                  </span>
                  {chk.is_demonstration && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      Demo
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white line-clamp-1">{chk.name}</h3>
                {chk.source_reference && (
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                    Ref: {chk.source_reference}
                  </p>
                )}
                {chk.description && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {chk.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-700/40 text-[11px] text-slate-400">
                <span>{chk.version_count || 1} Version(s)</span>
                <span className="font-mono text-sky-400 font-semibold">{chk.latest_version || 'v1.0.0'}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Version & Rules Card */}
      {activeChecklist && selectedVersion && (
        <div className="bg-[#1E293B] border border-slate-700/80 rounded-xl overflow-hidden shadow-xl">
          {/* Version Header / Controls */}
          <div className="p-5 border-b border-slate-700/60 bg-slate-900/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Version Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Version:</span>
                  <select
                    value={selectedVersion.id}
                    onChange={(e) => handleSelectVersion(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold text-white focus:outline-none focus:border-sky-500"
                  >
                    {activeChecklist.versions?.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.version} ({v.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Pill */}
                {selectedVersion.is_locked ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Lock className="w-3 h-3" />
                    <span>Locked (Published Immutable)</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    <Unlock className="w-3 h-3" />
                    <span>Draft (Editable)</span>
                  </div>
                )}

                {selectedVersion.effective_date && (
                  <span className="text-xs text-slate-400">
                    Effective: <strong className="text-slate-300 font-mono">{selectedVersion.effective_date}</strong>
                  </span>
                )}
              </div>

              {/* Version Level Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsCloneModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition"
                  title="Clone current version rules into a new draft revision"
                >
                  <GitBranch className="w-3.5 h-3.5 text-sky-400" />
                  <span>Clone New Version</span>
                </button>

                {!selectedVersion.is_locked && (
                  <button
                    onClick={handlePublishVersion}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                    title="Publish version to make it immutable"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Publish Version</span>
                  </button>
                )}

                {/* Export Version */}
                <a
                  href={api.getExportVersionUrl(selectedVersion.id, 'csv')}
                  download={`${activeChecklist.name}_${selectedVersion.version}.csv`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition"
                  title="Export rules as CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </a>
                <a
                  href={api.getExportVersionUrl(selectedVersion.id, 'json')}
                  download={`${activeChecklist.name}_${selectedVersion.version}.json`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition"
                  title="Export rules as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </a>

                {/* Add Rule Button */}
                <button
                  onClick={() => {
                    setEditingRule(null);
                    setIsRuleModalOpen(true);
                  }}
                  disabled={selectedVersion.is_locked}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition"
                  title={selectedVersion.is_locked ? 'Version is locked. Clone to edit.' : 'Add new rule'}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rule</span>
                </button>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 border-t border-slate-800">
              <span>
                Total Rules: <strong className="text-white font-mono">{rules.length}</strong>
              </span>
              <span>•</span>
              <span className="text-rose-400 font-semibold">
                {criticalCount} Critical
              </span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">
                {majorCount} Major
              </span>
              <span>•</span>
              <span className="text-sky-400 font-semibold">
                {minorCount} Minor
              </span>
              {selectedVersion.changelog_summary && (
                <>
                  <span>•</span>
                  <span className="text-slate-400 italic">
                    Changelog: {selectedVersion.changelog_summary}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="p-4 border-b border-slate-700/60 bg-slate-900/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rule key, target field, description..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Severity & Rule Type Filters */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Severity:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="ALL">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="Major">Major</option>
                  <option value="Minor">Minor</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Type:</span>
                <select
                  value={ruleTypeFilter}
                  onChange={(e) => setRuleTypeFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="ALL">All Types</option>
                  <option value="REQUIRED_PRESENCE">REQUIRED_PRESENCE</option>
                  <option value="FORMAT_REGEX">FORMAT_REGEX</option>
                  <option value="VALUE_MATCH">VALUE_MATCH</option>
                  <option value="DATE_EXPIRATION">DATE_EXPIRATION</option>
                  <option value="CROSS_FIELD_MATCH">CROSS_FIELD_MATCH</option>
                </select>
              </div>
            </div>
          </div>

          {/* Rules Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700/60 bg-slate-900/30 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">Status</th>
                  <th className="py-3 px-4 w-48">Rule Key</th>
                  <th className="py-3 px-4 w-40">Target Field</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 w-28 text-center">Severity</th>
                  <th className="py-3 px-4 w-40">Validation Type</th>
                  <th className="py-3 px-4 w-44">Expected / Pattern</th>
                  <th className="py-3 px-4 w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No compliance rules match the active search/filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-800/40 transition ${
                        !r.enabled ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleRuleEnabled(r)}
                          disabled={selectedVersion.is_locked}
                          className={`w-4 h-4 rounded flex items-center justify-center transition ${
                            r.enabled
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                          } ${selectedVersion.is_locked ? 'cursor-not-allowed' : ''}`}
                          title={
                            selectedVersion.is_locked
                              ? 'Version locked'
                              : r.enabled
                              ? 'Click to disable'
                              : 'Click to enable'
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* Rule Key */}
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {r.rule_key}
                      </td>

                      {/* Field Key */}
                      <td className="py-3 px-4 font-mono text-sky-400">
                        {r.field_key}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 text-slate-300 leading-relaxed">
                        {r.description}
                      </td>

                      {/* Severity */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            r.severity === 'Critical'
                              ? 'bg-rose-500/10 border border-rose-500/25 text-rose-400'
                              : r.severity === 'Major'
                              ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400'
                              : 'bg-slate-700/40 border border-slate-600/40 text-slate-300'
                          }`}
                        >
                          {r.severity}
                        </span>
                      </td>

                      {/* Rule Type */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {r.rule_type}
                      </td>

                      {/* Expected / Pattern */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300 truncate max-w-[180px]">
                        {r.expected_value ? (
                          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-teal-300">
                            {r.expected_value}
                          </span>
                        ) : (
                          <span className="text-slate-600 italic">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {selectedVersion.is_locked ? (
                          <span
                            className="inline-flex items-center text-slate-500"
                            title="Version is locked. Clone to edit."
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingRule(r);
                                setIsRuleModalOpen(true);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition"
                              title="Edit rule"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(r.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateChecklistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateChecklist}
      />

      <UploadChecklistModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadChecklist}
        checklists={checklists}
      />

      <NewVersionModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onClone={handleCloneVersion}
        sourceVersion={selectedVersion}
        checklistName={activeChecklist?.name || ''}
      />

      <RuleEditorModal
        isOpen={isRuleModalOpen}
        onClose={() => {
          setIsRuleModalOpen(false);
          setEditingRule(null);
        }}
        onSave={handleSaveRule}
        rule={editingRule}
      />
    </div>
  );
};
