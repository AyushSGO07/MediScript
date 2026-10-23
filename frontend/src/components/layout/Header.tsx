import React from 'react';
import { useApp } from '../../context/AppContext';
import { DemoRoleSwitcher } from '../common/DemoRoleSwitcher';
import { Search, ChevronRight } from 'lucide-react';

export const Header: React.FC = () => {
  const { currentView, setSearchOpen } = useApp();

  const getBreadcrumb = () => {
    switch (currentView) {
      case 'overview':
        return 'Overview Dashboard';
      case 'projects':
        return 'Projects Management';
      case 'reviews':
        return 'Label Reviews';
      case 'requirements':
        return 'Requirements & Checklists';
      case 'reports':
        return 'Audit Reports';
      case 'activity':
        return 'Audit Activity History';
      case 'settings':
        return 'Settings & Configuration';
      default:
        return 'Workspace';
    }
  };

  return (
    <header className="h-14 bg-[#1E293B]/80 backdrop-blur-sm border-b border-slate-700/60 px-5 flex items-center justify-between shrink-0 select-none">
      {/* Breadcrumb Path */}
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-slate-400 hover:text-slate-200 cursor-pointer">MediScript</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="font-semibold text-slate-200">{getBreadcrumb()}</span>
      </div>

      {/* Global Actions Bar */}
      <div className="flex items-center space-x-4">
        {/* Quick Search Button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-700/80 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">Quick search...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
            Ctrl+K
          </kbd>
        </button>

        {/* Engine Status Badge */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Local Engine: Ready</span>
        </div>

        {/* Demo Role Switcher */}
        <DemoRoleSwitcher />
      </div>
    </header>
  );
};
