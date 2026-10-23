import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { DemoRole } from '../../types';
import { ChevronDown, Check } from 'lucide-react';

const ROLES: { id: DemoRole; label: string; title: string; subtitle: string }[] = [
  {
    id: 'reviewer',
    label: 'Dr. Sarah Lin',
    title: 'Dr. Sarah Lin',
    subtitle: 'Lead Regulatory Reviewer',
  },
  {
    id: 'quality_lead',
    label: 'Marcus Vance',
    title: 'Marcus Vance',
    subtitle: 'Quality Assurance Lead',
  },
  {
    id: 'admin',
    label: 'System Admin',
    title: 'System Operator',
    subtitle: 'Workspace Administrator',
  },
];

export const DemoRoleSwitcher: React.FC = () => {
  const { demoRole, setDemoRole } = useApp();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeRole = ROLES.find((r) => r.id === demoRole) || ROLES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-200 transition-colors"
        title="Switch Demo Role"
      >
        <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px]">
          {activeRole.title[0]}
        </div>
        <div className="flex flex-col text-left">
          <span className="font-semibold text-slate-100 leading-tight">{activeRole.label}</span>
          <span className="text-[10px] text-slate-400 leading-none">{activeRole.subtitle}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 z-50">
          <div className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider text-slate-400 border-b border-slate-800">
            Active Identity
          </div>
          {ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => {
                setDemoRole(role.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors hover:bg-slate-800 ${
                demoRole === role.id ? 'bg-sky-500/10 text-sky-400' : 'text-slate-300'
              }`}
            >
              <div>
                <p className="font-semibold text-slate-200">{role.title}</p>
                <p className="text-[11px] text-slate-400">{role.subtitle}</p>
              </div>
              {demoRole === role.id && <Check className="w-4 h-4 text-sky-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
