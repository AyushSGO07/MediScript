import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavigationView } from '../../types';
import {
  LayoutDashboard,
  FolderKanban,
  FileCheck2,
  ListChecks,
  FileText,
  History,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface NavItem {
  id: NavigationView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'reviews', label: 'Label Reviews', icon: FileCheck2 },
  { id: 'requirements', label: 'Requirements', icon: ListChecks },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'activity', label: 'Activity', icon: History },
  { id: 'settings', label: 'Settings', icon: Sliders },
];

export const Sidebar: React.FC = () => {
  const { currentView, setCurrentView, sidebarCollapsed, setSidebarCollapsed, setSelectedReviewId } = useApp();

  return (
    <aside
      className={`h-screen bg-[#1E293B] border-r border-slate-700/60 flex flex-col transition-all duration-200 select-none ${
        sidebarCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-700/60">
        {!sidebarCollapsed && (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-white tracking-tight">MediScript</span>
              <span className="text-[10px] font-mono text-slate-400">v1.0.0-dev</span>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="mx-auto p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        )}

        {/* Collapse toggle */}
        {!sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setSelectedReviewId(null);
                setCurrentView(item.id);
              }}
              className={`w-full flex items-center rounded-lg transition-colors text-xs font-medium ${
                sidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 space-x-3'
              } ${
                isActive
                  ? 'bg-sky-500/15 text-sky-400 border-l-2 border-sky-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Workspace Footer */}
      <div className="p-3 border-t border-slate-700/60 bg-slate-900/40">
        {sidebarCollapsed ? (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="w-full flex justify-center py-1 text-slate-400 hover:text-slate-200"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center justify-between text-xs">
            <div className="truncate">
              <p className="text-[10px] uppercase font-mono text-slate-400">Workspace</p>
              <p className="font-semibold text-slate-200 truncate">Tata Elxsi Lab</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400" title="Connected" />
          </div>
        )}
      </div>
    </aside>
  );
};
