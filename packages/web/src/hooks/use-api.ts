'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { useAuth } from '@/contexts/auth-context';
import { createFetcher, apiFetch } from '@/lib/api';

export function useApi<T>(
  endpoint: string | null,
  options?: SWRConfiguration
) {
  const { token } = useAuth();
  const fetcher = createFetcher(token);

  return useSWR<T>(endpoint, fetcher, {
    revalidateOnFocus: false,
    ...options,
  });
}

export function useProjects() {
  return useApi<{ data: any[]; pagination: any }>('/api/v1/projects');
}

export function useProject(id: string | null) {
  return useApi<any>(id ? `/api/v1/projects/${id}` : null);
}

export function useAgentSessions(projectId: string | null) {
  return useApi<{ data: any[]; pagination: any }>(
    projectId ? `/api/v1/agents/projects/${projectId}/sessions` : null
  );
}

export function useRuntimes(projectId: string | null) {
  return useApi<{ data: any[]; pagination: any }>(
    projectId ? `/api/v1/runtimes/projects/${projectId}/runtimes` : null
  );
}

export function useCronJobs(projectId: string | null) {
  return useApi<{ data: any[]; pagination: any }>(
    projectId ? `/api/v1/crons/projects/${projectId}/jobs` : null
  );
}

export function useAlerts(projectId: string | null) {
  return useApi<{ data: any[]; pagination: any }>(
    projectId ? `/api/v1/alerts/projects/${projectId}/alerts` : null
  );
}

// Mutation helpers
export function useMutation() {
  const { token } = useAuth();

  return {
    post: <T>(endpoint: string, data: unknown) =>
      apiFetch<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }),
    patch: <T>(endpoint: string, data: unknown) =>
      apiFetch<T>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
      }),
    delete: (endpoint: string) =>
      apiFetch(endpoint, {
        method: 'DELETE',
        token,
      }),
  };
}
