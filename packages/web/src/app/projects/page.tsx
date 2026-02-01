'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useProjects, useMutation } from '@/hooks/use-api';
import { StatusBadge, DataTable } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function ProjectsPage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useProjects();
  const { post } = useMutation();
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', slug: '', description: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await post('/api/v1/projects', newProject);
      mutate();
      setIsCreating(false);
      setNewProject({ name: '', slug: '', description: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Project',
      render: (project: any) => (
        <div>
          <p className="font-medium text-slate-900">{project.name}</p>
          <p className="text-sm text-slate-500">{project.slug}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (project: any) => <StatusBadge status={project.status} size="sm" />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (project: any) => (
        <span className="text-sm text-slate-500">
          {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your monitored projects
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {isCreating && (
        <div className="card mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4">Create New Project</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="input"
                  placeholder="My Project"
                  required
                />
              </div>
              <div>
                <label className="label">Slug</label>
                <input
                  type="text"
                  value={newProject.slug}
                  onChange={(e) => setNewProject({ ...newProject, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="input"
                  placeholder="my-project"
                  required
                  pattern="[a-z0-9-]+"
                />
              </div>
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <input
                type="text"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                className="input"
                placeholder="Brief description of your project"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">Create Project</button>
              <button type="button" onClick={() => setIsCreating(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <DataTable
          data={data?.data || []}
          columns={columns}
          keyField="id"
          isLoading={isLoading}
          emptyMessage="No projects yet. Create your first project to get started."
          onRowClick={(project) => router.push(`/projects/${project.id}`)}
        />
      </div>
    </div>
  );
}
