# Hooks

A unified monitoring and observability platform for development workflows. Monitor Claude Code agents, runtime services, and scheduled tasks from a single dashboard.

> **New to Hooks?** Check out the [Getting Started Guide](./GETTING_STARTED.md) for step-by-step setup instructions.

## Features

- **Claude Code Agent Monitoring** - Real-time status of AI coding assistants across projects
- **Runtime Monitoring** - Health checks for HTTP endpoints, TCP services, processes, and Docker containers
- **Cron Job Tracking** - Monitor scheduled tasks with miss detection and failure alerts
- **Web Dashboard** - Real-time visualization with WebSocket updates
- **Alerts** - Configurable notifications via email, Slack, webhooks, or PagerDuty

## Architecture

```
packages/
  cli/      - Command-line interface for reporting events
  daemon/   - Background service for runtime health checks
  server/   - REST API and WebSocket backend
  web/      - Next.js dashboard
  shared/   - Common types and utilities
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for services)
- npm 10+

### Development Setup

1. **Clone and install dependencies:**

```bash
git clone <repo-url> hooks
cd hooks
npm install
```

2. **Start development services (PostgreSQL, Redis):**

```bash
docker-compose -f docker-compose.dev.yml up -d
```

3. **Build all packages:**

```bash
npm run build
```

4. **Start the server:**

```bash
npm run dev -w @hooks/server
```

5. **Start the web dashboard (in another terminal):**

```bash
npm run dev -w @hooks/web
```

6. **Access the dashboard at `http://localhost:3000`**

## Configuration

### Server Configuration

Environment variables for the server:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | API server port |
| `HOST` | `0.0.0.0` | Server host |
| `LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |

### CLI Configuration

The CLI stores configuration in `~/.hooks/config.yaml`:

```yaml
server:
  url: http://localhost:3001
  token: hk_your_api_token
project:
  id: your_project_id
```

### Claude Code Integration

To monitor Claude Code agents, add hooks to your `~/.claude/settings.json`:

```bash
hooks-cli setup-claude-hooks
```

Or manually configure:

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
    "Stop": [
      {
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

## CLI Commands

### Authentication

```bash
# Login with email/password
hooks-cli login

# Configure server URL
hooks-cli config set server.url http://localhost:3001
```

### Agent Monitoring

```bash
# Report agent event
hooks-cli agent event --type session_start --session-id <id>

# Check agent status
hooks-cli agent status
```

### Cron Monitoring

```bash
# Wrap a cron job for monitoring
hooks-cli cron wrap --name "daily-backup" -- ./backup.sh

# Report cron event manually
hooks-cli cron start --name "daily-backup"
hooks-cli cron end --name "daily-backup" --success
```

### Runtime Monitoring

```bash
# Register a runtime check
hooks-cli runtime register --name "api" --type http --url https://api.example.com/health
```

## Daemon

The daemon runs health checks for configured runtimes:

```bash
# Start the daemon
hooks-daemon start

# Check daemon status
hooks-daemon status
```

Configuration file (`~/.hooks/daemon.yaml`):

```yaml
runtimes:
  - name: api-server
    type: http
    config:
      url: https://api.example.com/health
      method: GET
      expectedStatus: 200
    intervalMs: 30000
    timeoutMs: 5000
```

## API Reference

### Authentication

All API requests require a Bearer token:

```
Authorization: Bearer hk_your_token_here
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/auth/login` | Login |
| `POST` | `/api/v1/auth/register` | Register |
| `GET` | `/api/v1/projects` | List projects |
| `POST` | `/api/v1/projects` | Create project |
| `GET` | `/api/v1/agents/projects/:id/sessions` | List agent sessions |
| `POST` | `/api/v1/agents/events` | Report agent event |
| `GET` | `/api/v1/crons/projects/:id/jobs` | List cron jobs |
| `POST` | `/api/v1/crons/events` | Report cron event |
| `GET` | `/api/v1/runtimes/projects/:id` | List runtimes |
| `POST` | `/api/v1/runtimes/status` | Report runtime status |
| `GET` | `/api/v1/alerts/projects/:id/alerts` | List alerts |

### WebSocket

Connect to `/ws` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

// Authenticate
ws.send(JSON.stringify({ type: 'auth', payload: { token: 'hk_...' } }));

// Subscribe to project events
ws.send(JSON.stringify({
  type: 'subscribe',
  payload: { channel: 'project', id: 'prj_...' }
}));
```

## Docker Deployment

### Full Stack

```bash
docker-compose up -d
```

### Services Only (for local development)

```bash
docker-compose -f docker-compose.dev.yml up -d
```

## Testing

```bash
# Run all tests
npm test

# Run tests for specific package
npm run test -w @hooks/server
npm run test -w @hooks/cli
npm run test -w @hooks/daemon
```

## Project Structure

```
packages/
  cli/
    src/
      commands/     # CLI commands
      lib/          # Utilities (config, api-client, event-queue)
  daemon/
    src/
      checkers/     # Health check implementations (HTTP, TCP, etc.)
      lib/          # Config, scheduler
  server/
    src/
      routes/       # API routes
      lib/          # Auth, config, store, redis, pubsub
      schemas/      # Zod validation schemas
      db/           # Drizzle ORM schema and migrations
  web/
    src/
      app/          # Next.js app router pages
      components/   # React components
      contexts/     # Auth and WebSocket contexts
      hooks/        # Custom React hooks
      lib/          # API client
  shared/
    src/
      types/        # Shared TypeScript types
      utils/        # Shared utilities
```

## License

MIT
