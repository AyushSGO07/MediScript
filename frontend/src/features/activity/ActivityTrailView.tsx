import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  RefreshCw,
  Folder,
  ChevronLeft,
  ChevronRight,
  AlertOctagon,
  Loader2,
  Calendar,
} from 'lucide-react';
import { ActivityEvent, ActivityTypeCount } from '../../types';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { ActivityTimelineCard } from './ActivityTimelineCard';
import { ActivityDetailModal } from './ActivityDetailModal';

export const ActivityTrailView: React.FC = () => {
  const { projects } = useApp();

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [typeCounts, setTypeCounts] = useState<ActivityTypeCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 25;

  // Selected event for payload inspector
  const [inspectEvent, setInspectEvent] = useState<ActivityEvent | null>(null);

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const offset = (page - 1) * limit;
      const [listRes, typesRes] = await Promise.all([
        api.getActivityEvents({
          project_id: selectedProjectId || undefined,
          event_type: selectedType || undefined,
          search: searchTerm.trim() || undefined,
          limit,
          offset,
        }),
        api.getActivityTypes(),
      ]);

      setEvents(listRes.items);
      setTotalCount(listRes.total);
      setTypeCounts(typesRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to load activity audit trail');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, selectedType, selectedProjectId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedType('');
    setSelectedProjectId('');
    setPage(1);
  };

  // Group events by local date string
  const groupedEvents = useMemo(() => {
    const groups: { dateLabel: string; items: ActivityEvent[] }[] = [];
    const groupMap = new Map<string, ActivityEvent[]>();

    events.forEach((ev) => {
      const d = new Date(ev.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let label = d.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      if (d.toDateString() === today.toDateString()) {
        label = `Today — ${label}`;
      } else if (d.toDateString() === yesterday.toDateString()) {
        label = `Yesterday — ${label}`;
      }

      if (!groupMap.has(label)) {
        groupMap.set(label, []);
        groups.push({ dateLabel: label, items: groupMap.get(label)! });
      }
      groupMap.get(label)!.push(ev);
    });

    return groups;
  }, [events]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/80 backdrop-blur shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Audit Activity History
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950 border border-indigo-500/40 text-indigo-300">
                  {totalCount} Total Events
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Append-only regulatory activity trail capturing all system events with actor traceability.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setPage(1);
              loadData();
            }}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shrink-0"
            title="Refresh activity logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Breakdown category pills */}
        {typeCounts.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => {
                setSelectedType('');
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] whitespace-nowrap transition-colors ${
                selectedType === ''
                  ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              All Types ({totalCount})
            </button>
            {typeCounts.map((tc) => (
              <button
                key={tc.event_type}
                onClick={() => {
                  setSelectedType(selectedType === tc.event_type ? '' : tc.event_type);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] whitespace-nowrap transition-colors ${
                  selectedType === tc.event_type
                    ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {tc.event_type} ({tc.count})
              </button>
            ))}
          </div>
        )}

        {/* 2. Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-800/80">
          {/* Keyword Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search actors, rule keys, event details..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </form>

          {/* Project Filter */}
          <div className="relative min-w-[180px]">
            <Folder className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(searchTerm || selectedType || selectedProjectId) && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Timeline Body */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-8">
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-xs font-medium">Querying immutable activity trail...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="py-24 text-center space-y-3 text-slate-500">
            <History className="w-12 h-12 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No activity events found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No matching activity events recorded for the selected search filters.
            </p>
            {(searchTerm || selectedType || selectedProjectId) && (
              <button
                onClick={handleResetFilters}
                className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          groupedEvents.map((group) => (
            <div key={group.dateLabel} className="space-y-4">
              {/* Date Group Heading */}
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 border-b border-slate-800 pb-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{group.dateLabel}</span>
                <span className="text-slate-600 font-normal">({group.items.length})</span>
              </div>

              {/* Event Cards */}
              <div className="space-y-3 pl-2">
                {group.items.map((ev) => (
                  <ActivityTimelineCard
                    key={ev.id}
                    event={ev}
                    projectName={ev.project_id ? projectMap.get(ev.project_id) : undefined}
                    onInspect={setInspectEvent}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. Pagination Footer */}
      {!isLoading && totalCount > limit && (
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} of {totalCount} events
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="font-mono text-slate-300 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Payload Inspector Modal */}
      {inspectEvent && (
        <ActivityDetailModal
          isOpen={!!inspectEvent}
          event={inspectEvent}
          onClose={() => setInspectEvent(null)}
        />
      )}
    </div>
  );
};
