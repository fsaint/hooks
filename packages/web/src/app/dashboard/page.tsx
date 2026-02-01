'use client';

import { Bot, Server, Clock, AlertTriangle } from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ActivityFeed } from '@/components/ui/activity-feed';
import { useProjects } from '@/hooks/use-api';

export default function DashboardPage() {
  const { data: projectsData, isLoading } = useProjects();

  // Mock data for demo - would come from API
  const stats = {
    activeAgents: 3,
    healthyRuntimes: 12,
    runningCrons: 2,
    activeAlerts: 1,
  };

  const recentActivity = [
    {
      id: '1',
      type: 'tool_use',
      message: 'Agent completed file edit in project-alpha',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      type: 'health_check',
      message: 'Runtime api-server health check passed',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      status: 'healthy',
    },
    {
      id: '3',
      type: 'cron_end',
      message: 'Cron job backup-daily completed successfully',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      status: 'success',
    },
    {
      id: '4',
      type: 'session_start',
      message: 'New agent session started in project-beta',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      type: 'error',
      message: 'Runtime db-primary health check failed',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      status: 'error',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of your monitoring status
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard
          title="Active Agents"
          value={stats.activeAgents}
          icon={Bot}
          variant="default"
          subtitle="Claude Code sessions"
        />
        <MetricCard
          title="Healthy Runtimes"
          value={stats.healthyRuntimes}
          icon={Server}
          variant="success"
          subtitle="All services operational"
        />
        <MetricCard
          title="Running Crons"
          value={stats.runningCrons}
          icon={Clock}
          variant="default"
          subtitle="Jobs in progress"
        />
        <MetricCard
          title="Active Alerts"
          value={stats.activeAlerts}
          icon={AlertTriangle}
          variant={stats.activeAlerts > 0 ? 'danger' : 'success'}
          subtitle={stats.activeAlerts > 0 ? 'Needs attention' : 'All clear'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="card">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Activity
            </h2>
          </div>
          <div className="p-6">
            <ActivityFeed items={recentActivity} maxItems={5} />
          </div>
        </div>

        {/* Projects Overview */}
        <div className="card">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded" />
                ))}
              </div>
            ) : projectsData?.data?.length ? (
              <div className="space-y-3">
                {projectsData.data.slice(0, 5).map((project: any) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {project.name}
                      </p>
                      <p className="text-sm text-slate-500">{project.slug}</p>
                    </div>
                    <StatusBadge status={project.status} size="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-slate-500">
                No projects yet. Create your first project to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
