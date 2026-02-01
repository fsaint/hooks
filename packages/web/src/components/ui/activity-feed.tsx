import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { StatusBadge } from './status-badge';

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  emptyMessage?: string;
  maxItems?: number;
}

const typeIcons: Record<string, string> = {
  session_start: 'bg-green-500',
  session_end: 'bg-slate-400',
  tool_use: 'bg-blue-500',
  tool_result: 'bg-blue-400',
  error: 'bg-red-500',
  cron_start: 'bg-blue-500',
  cron_end: 'bg-green-500',
  cron_failed: 'bg-red-500',
  health_check: 'bg-primary-500',
};

export function ActivityFeed({
  items,
  emptyMessage = 'No recent activity',
  maxItems = 10,
}: ActivityFeedProps) {
  const displayItems = items.slice(0, maxItems);

  if (displayItems.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {displayItems.map((item, idx) => (
          <li key={item.id}>
            <div className="relative pb-8">
              {idx !== displayItems.length - 1 && (
                <span
                  className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className={clsx(
                      'flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white',
                      typeIcons[item.type] || 'bg-slate-400'
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-white" />
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-slate-700">{item.message}</p>
                    {item.status && (
                      <StatusBadge status={item.status} size="sm" />
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-slate-500">
                    {formatDistanceToNow(new Date(item.timestamp), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
