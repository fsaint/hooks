'use client';

import { Bot } from 'lucide-react';
import { StatusBadge, DataTable } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

export default function AgentsPage() {
  // Mock data - would come from API
  const sessions = [
    { id: '1', projectName: 'project-alpha', status: 'active', startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), lastActivityAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
    { id: '2', projectName: 'project-beta', status: 'idle', startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), lastActivityAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
    { id: '3', projectName: 'project-gamma', status: 'completed', startedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), lastActivityAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  ];

  const columns = [
    {
      key: 'projectName',
      header: 'Project',
      render: (s: any) => <span className="font-medium">{s.projectName}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: any) => <StatusBadge status={s.status} size="sm" />,
    },
    {
      key: 'startedAt',
      header: 'Started',
      render: (s: any) => <span className="text-sm text-slate-500">{formatDistanceToNow(new Date(s.startedAt), { addSuffix: true })}</span>,
    },
    {
      key: 'lastActivityAt',
      header: 'Last Activity',
      render: (s: any) => <span className="text-sm text-slate-500">{formatDistanceToNow(new Date(s.lastActivityAt), { addSuffix: true })}</span>,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Bot className="h-7 w-7 text-primary-600" />
          Agent Sessions
        </h1>
        <p className="mt-1 text-sm text-slate-500">Monitor Claude Code agent activity across your projects</p>
      </div>
      <div className="card">
        <DataTable data={sessions} columns={columns} keyField="id" emptyMessage="No active agent sessions" />
      </div>
    </div>
  );
}
