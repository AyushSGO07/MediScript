import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
  accentColor?: 'sky' | 'teal' | 'emerald' | 'rose' | 'amber';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  subtitle,
  accentColor = 'sky',
}) => {
  const getColorClasses = () => {
    switch (accentColor) {
      case 'teal':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'rose':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'amber':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'sky':
      default:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    }
  };

  return (
    <div className="bg-[#1E293B] border border-slate-700/60 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-slate-600/80 transition-colors">
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">{title}</p>
        <p className="text-2xl font-bold text-slate-100 mt-1 font-mono">{value}</p>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-lg border ${getColorClasses()}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};
