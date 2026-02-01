'use client';

import { Clock } from 'lucide-react';
import { StatusBadge, DataTable } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

export default function CronsPage() {
  const cronJobs = [
    { id: '1', name: 'backup-daily', schedule: '0 0 * * *', status: 'healthy', lastRunAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), nextRun: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString() },
    { id: '2', name: 'cleanup-temp', schedule: '0 */6 * * *', status: 'healthy', lastRunAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), nextRun: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() },
    { id: '3', name: 'sync-data', schedule: '*/15 * * * *', status: 'failing', lastRunAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), nextRun: new Date(Date.now() + 15 * 60 * 1000).toISOString() },
  ];

  const columns = [
    { key: 'name', header: 'Job', render: (c: any) => <span className="font-medium">{c.name}</span> },
    { key: 'schedule', header: 'Schedule', render: (c: any) => <code className="text-xs bg-slate-100 px-2 py-1 rounded">{c.schedule}</code> },
    { key: 'status', header: 'Status', render: (c: any) => <StatusBadge status={c.status} size="sm" /> },
    { key: 'lastRunAt', header: 'Last Run', render: (c: any) => <span className="text-sm text-slate-500">{formatDistanceToNow(new Date(c.lastRunAt), { addSuffix: true })}</span> },
    { key: 'nextRun', header: 'Next Run', render: (c: any) => <span className="text-sm text-slate-500">{formatDistanceToNow(new Date(c.nextRun), { addSuffix: true })}</span> },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Clock className="h-7 w-7 text-primary-600" />
          Cron Jobs
        </h1>
        <p className="mt-1 text-sm text-slate-500">Monitor scheduled jobs and tasks</p>
      </div>
      <div className="card">
        <DataTable data={cronJobs} columns={columns} keyField="id" emptyMessage="No cron jobs configured" />
      </div>
    </div>
  );
}
