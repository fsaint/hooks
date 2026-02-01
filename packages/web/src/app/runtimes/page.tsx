'use client';

import { Server } from 'lucide-react';
import { StatusBadge, DataTable } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

export default function RuntimesPage() {
  const runtimes = [
    { id: '1', name: 'api-server', type: 'http', status: 'healthy', lastCheckAt: new Date(Date.now() - 30 * 1000).toISOString(), responseTimeMs: 45 },
    { id: '2', name: 'database', type: 'tcp', status: 'healthy', lastCheckAt: new Date(Date.now() - 30 * 1000).toISOString(), responseTimeMs: 12 },
    { id: '3', name: 'redis-cache', type: 'tcp', status: 'unhealthy', lastCheckAt: new Date(Date.now() - 30 * 1000).toISOString(), responseTimeMs: null },
  ];

  const columns = [
    { key: 'name', header: 'Runtime', render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: 'type', header: 'Type', render: (r: any) => <span className="text-sm text-slate-500 uppercase">{r.type}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} size="sm" /> },
    { key: 'responseTimeMs', header: 'Response', render: (r: any) => r.responseTimeMs ? <span className="text-sm">{r.responseTimeMs}ms</span> : <span className="text-sm text-slate-400">-</span> },
    { key: 'lastCheckAt', header: 'Last Check', render: (r: any) => <span className="text-sm text-slate-500">{formatDistanceToNow(new Date(r.lastCheckAt), { addSuffix: true })}</span> },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Server className="h-7 w-7 text-primary-600" />
          Runtimes
        </h1>
        <p className="mt-1 text-sm text-slate-500">Monitor your services and infrastructure</p>
      </div>
      <div className="card">
        <DataTable data={runtimes} columns={columns} keyField="id" emptyMessage="No runtimes configured" />
      </div>
    </div>
  );
}
