/**
 * In-memory data store
 *
 * This is a temporary implementation that will be replaced with a
 * proper database in Task #10.
 */

import type {
  Project,
  AgentSession,
  AgentEvent,
  CronJob,
  CronRun,
  Runtime,
  HealthCheck,
  User,
  ApiToken,
  Alert,
  AlertRule,
} from '@hooks/shared';
import { generateId } from '@hooks/shared';

/** In-memory store for all data */
class Store {
  // Users and authentication
  private users = new Map<string, User>();
  private apiTokens = new Map<string, ApiToken>();
  private apiTokensByValue = new Map<string, ApiToken>();

  // Projects
  private projects = new Map<string, Project>();

  // Agent sessions and events
  private agentSessions = new Map<string, AgentSession>();
  private agentEvents = new Map<string, AgentEvent>();
  private agentEventsBySession = new Map<string, AgentEvent[]>();

  // Cron jobs and runs
  private cronJobs = new Map<string, CronJob>();
  private cronRuns = new Map<string, CronRun>();
  private cronRunsByJob = new Map<string, CronRun[]>();

  // Runtimes and health checks
  private runtimes = new Map<string, Runtime>();
  private healthChecks = new Map<string, HealthCheck>();
  private healthChecksByRuntime = new Map<string, HealthCheck[]>();

  // Alerts
  private alerts = new Map<string, Alert>();
  private alertRules = new Map<string, AlertRule>();

  // ==== Users ====

  createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const now = new Date().toISOString();
    const user: User = {
      id: generateId('usr'),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  // ==== API Tokens ====

  createApiToken(data: Omit<ApiToken, 'id' | 'createdAt'>): ApiToken {
    const token: ApiToken = {
      id: generateId('tok'),
      ...data,
      createdAt: new Date().toISOString(),
    };
    this.apiTokens.set(token.id, token);
    this.apiTokensByValue.set(token.value, token);
    return token;
  }

  getApiTokenByValue(value: string): ApiToken | undefined {
    return this.apiTokensByValue.get(value);
  }

  getApiTokensByUser(userId: string): ApiToken[] {
    return Array.from(this.apiTokens.values()).filter((t) => t.userId === userId);
  }

  deleteApiToken(id: string): boolean {
    const token = this.apiTokens.get(id);
    if (token) {
      this.apiTokensByValue.delete(token.value);
      this.apiTokens.delete(id);
      return true;
    }
    return false;
  }

  // ==== Projects ====

  createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const now = new Date().toISOString();
    const project: Project = {
      id: generateId('prj'),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(project.id, project);
    return project;
  }

  getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  getProjectBySlug(slug: string): Project | undefined {
    return Array.from(this.projects.values()).find((p) => p.slug === slug);
  }

  getProjectsByUser(userId: string): Project[] {
    return Array.from(this.projects.values()).filter(
      (p) => p.ownerId === userId || p.memberIds.includes(userId)
    );
  }

  updateProject(id: string, data: Partial<Project>): Project | undefined {
    const project = this.projects.get(id);
    if (project) {
      const updated = {
        ...project,
        ...data,
        id: project.id,
        updatedAt: new Date().toISOString(),
      };
      this.projects.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteProject(id: string): boolean {
    return this.projects.delete(id);
  }

  // ==== Agent Sessions ====

  createAgentSession(data: Omit<AgentSession, 'id'>): AgentSession {
    const session: AgentSession = {
      id: generateId('ses'),
      ...data,
    };
    this.agentSessions.set(session.id, session);
    return session;
  }

  getAgentSession(id: string): AgentSession | undefined {
    return this.agentSessions.get(id);
  }

  getAgentSessionsByProject(projectId: string): AgentSession[] {
    return Array.from(this.agentSessions.values()).filter(
      (s) => s.projectId === projectId
    );
  }

  updateAgentSession(id: string, data: Partial<AgentSession>): AgentSession | undefined {
    const session = this.agentSessions.get(id);
    if (session) {
      const updated = { ...session, ...data, id: session.id };
      this.agentSessions.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // ==== Agent Events ====

  createAgentEvent(data: Omit<AgentEvent, 'id'>): AgentEvent {
    const event: AgentEvent = {
      id: generateId('evt'),
      ...data,
    };
    this.agentEvents.set(event.id, event);

    // Index by session
    const sessionEvents = this.agentEventsBySession.get(data.sessionId) ?? [];
    sessionEvents.push(event);
    this.agentEventsBySession.set(data.sessionId, sessionEvents);

    return event;
  }

  getAgentEventsBySession(sessionId: string): AgentEvent[] {
    return this.agentEventsBySession.get(sessionId) ?? [];
  }

  // ==== Cron Jobs ====

  createCronJob(data: Omit<CronJob, 'id' | 'createdAt' | 'updatedAt'>): CronJob {
    const now = new Date().toISOString();
    const job: CronJob = {
      id: generateId('crn'),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.cronJobs.set(job.id, job);
    return job;
  }

  getCronJob(id: string): CronJob | undefined {
    return this.cronJobs.get(id);
  }

  getCronJobByName(projectId: string, name: string): CronJob | undefined {
    return Array.from(this.cronJobs.values()).find(
      (j) => j.projectId === projectId && j.name === name
    );
  }

  getCronJobsByProject(projectId: string): CronJob[] {
    return Array.from(this.cronJobs.values()).filter((j) => j.projectId === projectId);
  }

  updateCronJob(id: string, data: Partial<CronJob>): CronJob | undefined {
    const job = this.cronJobs.get(id);
    if (job) {
      const updated = {
        ...job,
        ...data,
        id: job.id,
        updatedAt: new Date().toISOString(),
      };
      this.cronJobs.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // ==== Cron Runs ====

  createCronRun(data: Omit<CronRun, 'id'>): CronRun {
    const run: CronRun = {
      id: generateId('run'),
      ...data,
    };
    this.cronRuns.set(run.id, run);

    // Index by job
    const jobRuns = this.cronRunsByJob.get(data.jobId) ?? [];
    jobRuns.push(run);
    this.cronRunsByJob.set(data.jobId, jobRuns);

    return run;
  }

  getCronRun(id: string): CronRun | undefined {
    return this.cronRuns.get(id);
  }

  getCronRunsByJob(jobId: string, limit = 100): CronRun[] {
    const runs = this.cronRunsByJob.get(jobId) ?? [];
    return runs.slice(-limit);
  }

  updateCronRun(id: string, data: Partial<CronRun>): CronRun | undefined {
    const run = this.cronRuns.get(id);
    if (run) {
      const updated = { ...run, ...data, id: run.id };
      this.cronRuns.set(id, updated);

      // Update in job index
      const jobRuns = this.cronRunsByJob.get(run.jobId) ?? [];
      const idx = jobRuns.findIndex((r) => r.id === id);
      if (idx >= 0) {
        jobRuns[idx] = updated;
      }

      return updated;
    }
    return undefined;
  }

  // ==== Runtimes ====

  createRuntime(data: Omit<Runtime, 'id' | 'createdAt' | 'updatedAt'>): Runtime {
    const now = new Date().toISOString();
    const runtime: Runtime = {
      id: generateId('rtm'),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.runtimes.set(runtime.id, runtime);
    return runtime;
  }

  getRuntime(id: string): Runtime | undefined {
    return this.runtimes.get(id);
  }

  getRuntimeByName(projectId: string, name: string): Runtime | undefined {
    return Array.from(this.runtimes.values()).find(
      (r) => r.projectId === projectId && r.name === name
    );
  }

  getRuntimesByProject(projectId: string): Runtime[] {
    return Array.from(this.runtimes.values()).filter((r) => r.projectId === projectId);
  }

  updateRuntime(id: string, data: Partial<Runtime>): Runtime | undefined {
    const runtime = this.runtimes.get(id);
    if (runtime) {
      const updated = {
        ...runtime,
        ...data,
        id: runtime.id,
        updatedAt: new Date().toISOString(),
      };
      this.runtimes.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // ==== Health Checks ====

  createHealthCheck(data: Omit<HealthCheck, 'id'>): HealthCheck {
    const check: HealthCheck = {
      id: generateId('hck'),
      ...data,
    };
    this.healthChecks.set(check.id, check);

    // Index by runtime
    const runtimeChecks = this.healthChecksByRuntime.get(data.runtimeId) ?? [];
    runtimeChecks.push(check);
    // Keep only last 1000 checks per runtime
    if (runtimeChecks.length > 1000) {
      runtimeChecks.shift();
    }
    this.healthChecksByRuntime.set(data.runtimeId, runtimeChecks);

    return check;
  }

  getHealthChecksByRuntime(runtimeId: string, limit = 100): HealthCheck[] {
    const checks = this.healthChecksByRuntime.get(runtimeId) ?? [];
    return checks.slice(-limit);
  }

  getLatestHealthCheck(runtimeId: string): HealthCheck | undefined {
    const checks = this.healthChecksByRuntime.get(runtimeId) ?? [];
    return checks[checks.length - 1];
  }

  // ==== Alerts ====

  createAlert(data: Omit<Alert, 'id'>): Alert {
    const alert: Alert = {
      id: generateId('alt'),
      ...data,
    };
    this.alerts.set(alert.id, alert);
    return alert;
  }

  getAlert(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  getAlertsByProject(projectId: string): Alert[] {
    return Array.from(this.alerts.values()).filter((a) => a.projectId === projectId);
  }

  updateAlert(id: string, data: Partial<Alert>): Alert | undefined {
    const alert = this.alerts.get(id);
    if (alert) {
      const updated = { ...alert, ...data, id: alert.id };
      this.alerts.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // ==== Alert Rules ====

  createAlertRule(data: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule {
    const now = new Date().toISOString();
    const rule: AlertRule = {
      id: generateId('rul'),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.alertRules.set(rule.id, rule);
    return rule;
  }

  getAlertRulesByProject(projectId: string): AlertRule[] {
    return Array.from(this.alertRules.values()).filter((r) => r.projectId === projectId);
  }

  // ==== Utility ====

  /** Clear all data (for testing) */
  clear(): void {
    this.users.clear();
    this.apiTokens.clear();
    this.apiTokensByValue.clear();
    this.projects.clear();
    this.agentSessions.clear();
    this.agentEvents.clear();
    this.agentEventsBySession.clear();
    this.cronJobs.clear();
    this.cronRuns.clear();
    this.cronRunsByJob.clear();
    this.runtimes.clear();
    this.healthChecks.clear();
    this.healthChecksByRuntime.clear();
    this.alerts.clear();
    this.alertRules.clear();
  }
}

/** Singleton store instance */
export const store = new Store();
