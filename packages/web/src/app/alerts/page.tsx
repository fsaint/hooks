'use client';

import { Bell, CheckCircle } from 'lucide-react';
import { StatusBadge, DataTable } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

export default function AlertsPage() {
  const alerts = [
    { id: '1', type: 'runtime.unhealthy', severity: 'critical', message: 'Runtime redis-cache is unhealthy', status: 'active', createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
    { id: '2', type: 'cron.failed', severity: 'warning', message: 'Cron job sync-data failed with exit code 1', status: 'acknowledged', createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    { id: '3', type: 'runtime.recovered', severity: 'info', message: 'Runtime api-server recovered', status: 'resolved', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  ];

  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    warning: 'bg-amber-100 text-amber-800',
    info: 'bg-blue-100 text-blue-800',
  };

  const columns = [
    { key: 'severity', header: 'Severity', render: (a: any) => <span className={`text-xs font-medium px-2 py-1 rounded ${severityColors[a.severity]}`}>{a.severity}</span> },
    { key: 'message', header: 'Alert', render: (a: any) => <span className="text-sm">{a.message}</span> },
    { key: 'status', header: 'Status', render: (a: any) => <StatusBadge status={a.status} size="sm" /> },
    { key: 'createdAt', header: 'Time', render: (a: any) => <span className="text-sm text-slate-500">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span> },
  ];

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Bell className="h-7 w-7 text-primary-600" />
            Alerts
            {activeCount > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {activeCount}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">View and manage system alerts</p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Acknowledge All
        </button>
      </div>
      <div className="card">
        <DataTable data={alerts} columns={columns} keyField="id" emptyMessage="No alerts - all systems operational!" />
      </div>
    </div>
  );
}
