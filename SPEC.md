# Hooks Platform Specification

## Overview

Hooks is a unified monitoring and observability platform that provides visibility into:
1. **Claude Code agents** - Real-time status of AI coding assistants across projects
2. **Runtime services** - Long-running servers and applications
3. **Scheduled tasks** - Cron jobs and periodic processes

The platform aggregates status from multiple sources into a single dashboard, enabling developers to monitor their entire development and production ecosystem.

---

## 1. Claude Code Agent Monitoring

### 1.1 Hook Integration

Claude Code supports user-configurable hooks that execute shell commands in response to agent events. Hooks will leverage this mechanism to report agent status.

#### Supported Hook Events

| Event | Trigger | Data Available |
|-------|---------|----------------|
| `PreToolUse` | Before a tool executes | Tool name, parameters |
| `PostToolUse` | After a tool completes | Tool name, result status |
| `Notification` | Agent notifications | Message content |
| `Stop` | Agent session ends | Final status, summary |

#### Hook Configuration

Users configure hooks in `~/.claude/settings.json` or project-level `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "hooks-cli agent-event --event pre-tool --tool $TOOL_NAME"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "hooks-cli agent-event --event post-tool --tool $TOOL_NAME --status $EXIT_CODE"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "hooks-cli agent-event --event stop"
          }
        ]
      }
    ]
  }
}
```

### 1.2 Agent Status Data Model

```typescript
interface AgentSession {
  id: string;                    // Unique session identifier
  projectId: string;             // Associated project
  projectPath: string;           // Local path to project
  startedAt: Date;
  lastActivityAt: Date;
  status: 'active' | 'idle' | 'completed' | 'error';

  // Activity metrics
  toolCalls: number;
  filesModified: string[];
  currentTask?: string;

  // Recent activity log
  recentEvents: AgentEvent[];
}

interface AgentEvent {
  timestamp: Date;
  type: 'tool_start' | 'tool_complete' | 'tool_error' | 'notification' | 'stop';
  toolName?: string;
  message?: string;
  durationMs?: number;
}
```

### 1.3 CLI Commands for Agent Reporting

```bash
# Report agent event (called by hooks)
hooks-cli agent-event --event <type> [--tool <name>] [--status <code>] [--message <msg>]

# Manual agent status query
hooks-cli agent-status [--project <path>]

# List active agents
hooks-cli agent-list
```

---

## 2. Runtime Monitoring

### 2.1 Supported Runtime Types

| Type | Description | Health Check Method |
|------|-------------|---------------------|
| `http` | Web servers, APIs | HTTP endpoint polling |
| `tcp` | TCP services | Port connectivity |
| `process` | Local processes | PID/process name check |
| `docker` | Docker containers | Container status via Docker API |
| `command` | Custom health check | Exit code of shell command |

### 2.2 Runtime Configuration

Runtimes are configured per-project in `.hooks/config.yaml`:

```yaml
project:
  name: "my-api"
  id: "proj_abc123"

runtimes:
  - name: "api-server"
    type: http
    url: "http://localhost:3000/health"
    interval: 30s
    timeout: 5s
    expectedStatus: 200

  - name: "database"
    type: tcp
    host: localhost
    port: 5432
    interval: 60s

  - name: "worker-process"
    type: process
    match: "node worker.js"
    interval: 15s

  - name: "redis"
    type: docker
    container: "redis-cache"
    interval: 30s

  - name: "custom-check"
    type: command
    command: "./scripts/health-check.sh"
    interval: 60s
    successExitCode: 0
```

### 2.3 Runtime Data Model

```typescript
interface Runtime {
  id: string;
  projectId: string;
  name: string;
  type: 'http' | 'tcp' | 'process' | 'docker' | 'command';
  config: RuntimeConfig;

  status: 'healthy' | 'unhealthy' | 'unknown' | 'disabled';
  lastCheck: Date;
  lastHealthy: Date;
  consecutiveFailures: number;

  metrics: {
    uptime: number;           // Percentage
    avgResponseTime: number;  // ms (for http/tcp)
    checkHistory: HealthCheck[];
  };
}

interface HealthCheck {
  timestamp: Date;
  success: boolean;
  responseTimeMs?: number;
  errorMessage?: string;
}
```

### 2.4 Runtime Daemon

A lightweight daemon (`hooks-daemon`) runs locally to perform health checks:

```bash
# Start the daemon
hooks-daemon start

# Check daemon status
hooks-daemon status

# Stop the daemon
hooks-daemon stop

# Run once (for testing)
hooks-daemon check --once
```

The daemon:
- Reads configuration from all `.hooks/config.yaml` files in registered projects
- Performs health checks at configured intervals
- Reports status to the Hooks server
- Caches results locally for offline access

---

## 3. Cron Job Monitoring

### 3.1 Cron Integration Methods

#### Method A: Wrapper Script
Wrap cron commands to report execution:

```bash
# Instead of:
0 * * * * /path/to/script.sh

# Use:
0 * * * * hooks-cli cron-wrap --job "hourly-cleanup" -- /path/to/script.sh
```

#### Method B: Explicit Start/End
For complex jobs, report start and end separately:

```bash
#!/bin/bash
hooks-cli cron-start --job "data-sync"
# ... job logic ...
EXIT_CODE=$?
hooks-cli cron-end --job "data-sync" --exit-code $EXIT_CODE
```

#### Method C: Heartbeat
For long-running cron jobs, send periodic heartbeats:

```bash
hooks-cli cron-heartbeat --job "long-process"
```

### 3.2 Cron Configuration

```yaml
# In .hooks/config.yaml
crons:
  - name: "hourly-cleanup"
    schedule: "0 * * * *"
    timeout: 300s              # Alert if runs longer
    maxRuntime: 600s           # Kill if exceeds
    alertOnFailure: true
    alertOnMissed: true        # Alert if expected run doesn't happen

  - name: "daily-backup"
    schedule: "0 2 * * *"
    timeout: 3600s
    alertOnFailure: true
```

### 3.3 Cron Data Model

```typescript
interface CronJob {
  id: string;
  projectId: string;
  name: string;
  schedule: string;            // Cron expression

  status: 'idle' | 'running' | 'succeeded' | 'failed' | 'missed';

  lastRun?: {
    startedAt: Date;
    endedAt?: Date;
    exitCode?: number;
    durationMs: number;
    output?: string;           // Captured stdout/stderr (truncated)
  };

  nextExpectedRun: Date;

  stats: {
    totalRuns: number;
    successRate: number;
    avgDuration: number;
    recentRuns: CronRun[];
  };
}

interface CronRun {
  id: string;
  startedAt: Date;
  endedAt: Date;
  exitCode: number;
  durationMs: number;
  success: boolean;
}
```

---

## 4. Web Dashboard UI

### 4.1 Dashboard Views

#### Home / Overview
- Summary cards: Active agents, healthy/unhealthy runtimes, cron status
- Recent activity feed across all projects
- Alert/notification banner for issues

#### Projects List
- All registered projects with aggregated status
- Quick health indicator per project
- Search and filter capabilities

#### Project Detail
- **Agents Tab**: Active/recent Claude Code sessions, activity timeline
- **Runtimes Tab**: Service health status, uptime graphs, response time charts
- **Crons Tab**: Job list with last run status, execution history
- **Settings Tab**: Project configuration editor

#### Agents View
- All active agent sessions across projects
- Real-time activity stream
- Tool usage statistics

#### Alerts & History
- Alert configuration
- Historical incidents
- Notification log

### 4.2 UI Components

```
+----------------------------------------------------------+
|  HOOKS                    [Search]         [User] [Settings]|
+----------------------------------------------------------+
|        |                                                   |
| Projects|  Dashboard                                       |
| --------|                                                  |
| > my-api|  +------------+  +------------+  +------------+  |
|   backend|  | 3 Agents   |  | 5/6 Up     |  | 2 Crons OK |  |
|   frontend| | Active     |  | Runtimes   |  | 1 Running  |  |
|         |  +------------+  +------------+  +------------+  |
| Agents  |                                                  |
| Runtimes|  Recent Activity                                 |
| Crons   |  ------------------------------------------------|
| Alerts  |  [Agent] my-api: Edited src/index.ts      2m ago |
|         |  [Cron] daily-backup completed OK         15m ago|
|         |  [Runtime] redis-cache: Healthy           30m ago|
|         |  [Agent] frontend: Session ended          1h ago |
+----------------------------------------------------------+
```

### 4.3 Real-time Updates

The dashboard uses WebSocket connections for real-time updates:
- Agent activity streams
- Runtime status changes
- Cron job start/completion events
- Alert notifications

---

## 5. System Architecture

### 5.1 Components

```
┌─────────────────────────────────────────────────────────────┐
│                        User Machine                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ Claude Code  │    │ hooks-daemon │    │  Cron Jobs   │   │
│  │   + Hooks    │    │              │    │  (wrapped)   │   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘   │
│         │                   │                   │            │
│         └───────────────────┼───────────────────┘            │
│                             │                                │
│                      ┌──────┴───────┐                        │
│                      │  hooks-cli   │                        │
│                      └──────┬───────┘                        │
│                             │                                │
└─────────────────────────────┼────────────────────────────────┘
                              │ HTTPS/WSS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Hooks Server                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   REST API   │    │  WebSocket   │    │   Web UI     │   │
│  │              │    │   Server     │    │  (Static)    │   │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘   │
│         │                   │                                │
│         └───────────────────┘                                │
│                    │                                         │
│         ┌──────────┴──────────┐                              │
│         │    Event Processor  │                              │
│         └──────────┬──────────┘                              │
│                    │                                         │
│  ┌─────────────────┼─────────────────┐                       │
│  │                 │                 │                       │
│  ▼                 ▼                 ▼                       │
│ ┌────────┐    ┌─────────┐    ┌──────────────┐               │
│ │PostgreSQL│   │  Redis  │    │ Notification │               │
│ │(Storage)│    │ (Cache) │    │   Service    │               │
│ └────────┘    └─────────┘    └──────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Data Flow

1. **Agent Events**: Claude Code hooks → hooks-cli → API → Event Processor → DB + WebSocket broadcast
2. **Runtime Checks**: hooks-daemon → API → Event Processor → DB + WebSocket broadcast
3. **Cron Events**: Cron wrapper → hooks-cli → API → Event Processor → DB + WebSocket broadcast

### 5.3 Offline Support

The CLI and daemon support offline operation:
- Events are queued locally when server is unreachable
- Automatic sync when connection is restored
- Local status cache for `hooks-cli` queries

---

## 6. API Design

### 6.1 REST Endpoints

```
Authentication
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

Projects
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id

Agents
GET    /api/projects/:id/agents
GET    /api/agents/:sessionId
POST   /api/agents/events          # Event ingestion

Runtimes
GET    /api/projects/:id/runtimes
POST   /api/runtimes/status        # Status report from daemon
GET    /api/runtimes/:id/history

Crons
GET    /api/projects/:id/crons
POST   /api/crons/events           # Start/end/heartbeat events
GET    /api/crons/:id/runs

Alerts
GET    /api/alerts
PUT    /api/alerts/:id/acknowledge
GET    /api/alerts/settings
PUT    /api/alerts/settings
```

### 6.2 WebSocket Events

```typescript
// Client → Server
{ type: 'subscribe', projects: ['proj_123', 'proj_456'] }
{ type: 'unsubscribe', projects: ['proj_123'] }

// Server → Client
{ type: 'agent.activity', projectId: string, data: AgentEvent }
{ type: 'runtime.status', projectId: string, data: RuntimeStatus }
{ type: 'cron.started', projectId: string, data: CronRun }
{ type: 'cron.completed', projectId: string, data: CronRun }
{ type: 'alert', data: Alert }
```

---

## 7. Configuration

### 7.1 Global Configuration

`~/.hooks/config.yaml`:

```yaml
server:
  url: "https://hooks.example.com"
  # Or for self-hosted:
  # url: "http://localhost:8080"

auth:
  token: "hk_xxxxxxxxxxxxx"

defaults:
  checkInterval: 30s
  alertOnFailure: true
```

### 7.2 Project Configuration

`.hooks/config.yaml` in project root:

```yaml
project:
  name: "my-project"
  id: "proj_abc123"           # Assigned by server on registration

runtimes:
  # ... runtime definitions

crons:
  # ... cron definitions

alerts:
  channels:
    - type: email
      address: "team@example.com"
    - type: slack
      webhook: "${SLACK_WEBHOOK_URL}"

  rules:
    - condition: "runtime.unhealthy"
      severity: critical
      channels: [email, slack]
    - condition: "cron.failed"
      severity: warning
      channels: [slack]
```

---

## 8. Security Considerations

### 8.1 Authentication
- API tokens for CLI/daemon authentication
- OAuth/SSO for web dashboard
- Token scoping (read-only vs read-write)

### 8.2 Data Privacy
- Agent events may contain file paths and code snippets
- Configurable data retention policies
- Option to exclude sensitive paths from reporting
- Local-only mode for air-gapped environments

### 8.3 Network Security
- TLS for all communications
- Webhook signature verification
- Rate limiting on API endpoints

---

## 9. Deployment Options

### 9.1 Hosted (SaaS)
- Managed service at hooks.io (hypothetical)
- Free tier for individual developers
- Team plans with additional features

### 9.2 Self-Hosted
- Docker Compose for simple deployments
- Helm chart for Kubernetes
- Single binary option for minimal setups

```bash
# Docker Compose
docker-compose up -d

# Single binary
hooks-server --config /etc/hooks/server.yaml
```

---

## 10. Future Considerations

- **Team collaboration**: Shared dashboards, role-based access
- **Integrations**: PagerDuty, Opsgenie, Discord, custom webhooks
- **Metrics export**: Prometheus, DataDog, Grafana
- **Log aggregation**: Capture and search runtime logs
- **Mobile app**: Push notifications, quick status checks
- **AI insights**: Pattern detection, anomaly alerts, suggestions

---

## Appendix A: CLI Reference

```
hooks-cli - Hooks Platform CLI

USAGE:
    hooks-cli <COMMAND> [OPTIONS]

COMMANDS:
    init              Initialize hooks in current project
    register          Register project with Hooks server
    status            Show project status summary

    agent-event       Report agent event (used by Claude Code hooks)
    agent-status      Show agent status
    agent-list        List active agents

    runtime-check     Run health checks manually
    runtime-status    Show runtime status

    cron-wrap         Wrap a cron command for monitoring
    cron-start        Report cron job start
    cron-end          Report cron job end
    cron-heartbeat    Send cron heartbeat
    cron-status       Show cron job status

    config            Manage configuration
    login             Authenticate with Hooks server
    logout            Clear authentication

OPTIONS:
    -p, --project     Project path (default: current directory)
    -v, --verbose     Verbose output
    -q, --quiet       Suppress output
    --json            Output in JSON format
    -h, --help        Show help
```

---

## Appendix B: Example Setup

### Quick Start

```bash
# 1. Install CLI
brew install hooks-cli  # or: npm install -g @hooks/cli

# 2. Login
hooks-cli login

# 3. Initialize project
cd ~/projects/my-app
hooks-cli init

# 4. Configure Claude Code hooks (adds to .claude/settings.json)
hooks-cli setup-claude-hooks

# 5. Add runtime monitoring
# Edit .hooks/config.yaml to add your services

# 6. Start daemon
hooks-daemon start

# 7. Open dashboard
hooks-cli dashboard  # Opens web UI
```
