import { clsx } from 'clsx';

type Status = 'healthy' | 'unhealthy' | 'unknown' | 'active' | 'idle' | 'completed' | 'error' | 'running' | 'failed' | 'success' | 'disabled';

interface StatusBadgeProps {
  status: Status | string;
  size?: 'sm' | 'md' | 'lg';
}

const statusColors: Record<string, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-200',
  success: 'bg-green-100 text-green-800 border-green-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  
  unhealthy: 'bg-red-100 text-red-800 border-red-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  
  running: 'bg-blue-100 text-blue-800 border-blue-200',
  idle: 'bg-slate-100 text-slate-800 border-slate-200',
  
  unknown: 'bg-amber-100 text-amber-800 border-amber-200',
  disabled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const statusDots: Record<string, string> = {
  healthy: 'bg-green-500',
  success: 'bg-green-500',
  active: 'bg-green-500',
  completed: 'bg-green-500',
  
  unhealthy: 'bg-red-500',
  failed: 'bg-red-500',
  error: 'bg-red-500',
  
  running: 'bg-blue-500 animate-pulse',
  idle: 'bg-slate-400',
  
  unknown: 'bg-amber-500',
  disabled: 'bg-slate-400',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const colorClass = statusColors[normalizedStatus] || statusColors.unknown;
  const dotClass = statusDots[normalizedStatus] || statusDots.unknown;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-medium capitalize',
        colorClass,
        {
          'px-2 py-0.5 text-xs': size === 'sm',
          'px-2.5 py-1 text-xs': size === 'md',
          'px-3 py-1.5 text-sm': size === 'lg',
        }
      )}
    >
      <span className={clsx('rounded-full', dotClass, {
        'h-1.5 w-1.5': size === 'sm',
        'h-2 w-2': size === 'md',
        'h-2.5 w-2.5': size === 'lg',
      })} />
      {status}
    </span>
  );
}
