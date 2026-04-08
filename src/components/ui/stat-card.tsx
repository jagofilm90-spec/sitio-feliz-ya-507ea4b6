import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  meta?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: ReactNode;
  className?: string;
}

export const StatCard = ({ 
  label, 
  value, 
  meta, 
  trend,
  trendValue,
  icon,
  className 
}: StatCardProps) => (
  <div className={cn(
    "rounded-xl border border-ink-100 bg-white p-5 shadow-xs-soft hover:shadow-sm-soft hover:border-ink-200 transition-all duration-200",
    className
  )}>
    <div className="flex items-start justify-between mb-3">
      <span className="text-[11px] uppercase tracking-[0.18em] text-ink-400 font-medium">
        {label}
      </span>
      {icon && <span className="text-ink-300">{icon}</span>}
    </div>
    <div className="text-3xl font-sans font-semibold text-ink-900 tabular-nums tracking-tight">
      {value}
    </div>
    {(meta || trendValue) && (
      <div className="flex items-center gap-2 mt-2 text-xs text-ink-400">
        {trend === 'up' && <span className="text-emerald-600 font-medium">↑ {trendValue}</span>}
        {trend === 'down' && <span className="text-red-600 font-medium">↓ {trendValue}</span>}
        {meta}
      </div>
    )}
  </div>
);
