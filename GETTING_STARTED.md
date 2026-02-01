# Getting Started with Hooks

This guide walks you through setting up and deploying the Hooks monitoring platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Production Deployment](#production-deployment)
4. [Initial Setup](#initial-setup)
5. [Integrating with Claude Code](#integrating-with-claude-code)
6. [Setting Up Runtime Monitoring](#setting-up-runtime-monitoring)
7. [Setting Up Cron Monitoring](#setting-up-cron-monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js 20+** - [Download](https://nodejs.org/)
- **Docker & Docker Compose** - [Download](https://docs.docker.com/get-docker/)
- **npm 10+** (comes with Node.js)

### Verify Installation

```bash
node --version    # Should be v20.x or higher
npm --version     # Should be v10.x or higher
docker --version  # Should be v24.x or higher
```

---

## Local Development

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <repo-url> hooks
cd hooks

# Install all dependencies
npm install
```

### Step 2: Start Infrastructure Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Verify services are running:

```bash
docker-compose -f docker-compose.dev.yml ps
```

You should see:
```
NAME                STATUS
hooks-postgres-1    Up (healthy)
hooks-redis-1       Up (healthy)
```

### Step 3: Build All Packages

```bash
npm run build
```

### Step 4: Start the Server

```bash
npm run dev -w @hooks/server
```

The server will start at `http://localhost:3001`. You should see:

```
╭────────────────────────────────────────╮
│                                        │
│   Hooks Server v0.1.0                  │
│                                        │
│   Server running at:                   │
│   http://0.0.0.0:3001                  │
│                                        │
╰────────────────────────────────────────╯
```

### Step 5: Start the Web Dashboard

In a new terminal:

```bash
npm run dev -w @hooks/web
```

The dashboard will be available at `http://localhost:3000`.

### Step 6: Verify Everything Works

1. Open `http://localhost:3000` in your browser
2. You should see the login page
3. Check the API health: `curl http://localhost:3001/health`

---

## Production Deployment

### Option 1: Docker Compose (Recommended for Small Deployments)

#### Step 1: Configure Environment

Create a `.env` file in the project root:

```bash
# Database
POSTGRES_USER=hooks
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=hooks
DATABASE_URL=postgres://hooks:your_secure_password_here@postgres:5432/hooks

# Redis
REDIS_URL=redis://redis:6379

# Server
PORT=3001
LOG_LEVEL=info
CORS_ORIGINS=https://your-domain.com

# Web
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

#### Step 2: Build and Start

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d
```

#### Step 3: Verify Deployment

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f server
docker-compose logs -f web
```

### Option 2: Manual Deployment

#### Database Setup

1. Create a PostgreSQL database:

```sql
CREATE DATABASE hooks;
CREATE USER hooks WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE hooks TO hooks;
```

2. Run migrations:

```bash
DATABASE_URL=postgres://hooks:your_password@localhost:5432/hooks \
  npm run db:migrate -w @hooks/server
```

#### Redis Setup

Install and start Redis:

```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# macOS with Homebrew
brew install redis
brew services start redis
```

#### Server Deployment

1. Build the server:

```bash
npm run build -w @hooks/server
```

2. Start with environment variables:

```bash
DATABASE_URL=postgres://hooks:password@localhost:5432/hooks \
REDIS_URL=redis://localhost:6379 \
PORT=3001 \
node packages/server/dist/index.js
```

#### Web Dashboard Deployment

1. Build the dashboard:

```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com \
  npm run build -w @hooks/web
```

2. Start the production server:

```bash
npm run start -w @hooks/web
```

### Option 3: Using a Process Manager (PM2)

Install PM2:

```bash
npm install -g pm2
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'hooks-server',
      script: 'packages/server/dist/index.js',
      env: {
        DATABASE_URL: 'postgres://hooks:password@localhost:5432/hooks',
        REDIS_URL: 'redis://localhost:6379',
        PORT: 3001,
      },
    },
    {
      name: 'hooks-web',
      script: 'npm',
      args: 'run start -w @hooks/web',
      env: {
        PORT: 3000,
      },
    },
  ],
};
```

Start services:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Initial Setup

### Step 1: Create an Account

1. Open the web dashboard
2. Click "Register" or use the API:

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password",
    "name": "Admin User"
  }'
```

### Step 2: Get an API Token

After logging in, create an API token:

```bash
# First, login to get a session
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'

# Response includes your token:
# {"user": {...}, "token": "hk_abc123..."}
```

Save this token - you'll need it for the CLI and integrations.

### Step 3: Create a Project

```bash
curl -X POST http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer hk_your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "slug": "my-project"
  }'

# Response: {"id": "prj_abc123", "name": "My Project", ...}
```

### Step 4: Configure the CLI

Install and configure the CLI:

```bash
# Link the CLI globally (from project root)
npm link -w @hooks/cli

# Configure the CLI
hooks-cli config set server.url http://localhost:3001
hooks-cli config set server.token hk_your_token
hooks-cli config set project.id prj_your_project_id

# Verify configuration
hooks-cli config list
```

---

## Integrating with Claude Code

### Automatic Setup

Run the setup command:

```bash
hooks-cli setup-claude-hooks
```

This will:
1. Detect your Claude Code settings file
2. Add the necessary hooks configuration
3. Verify the setup

### Manual Setup

Edit `~/.claude/settings.json` (or `.claude/settings.json` in your project):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "hooks-cli agent event --type tool_use --data '{\"tool\": \"$TOOL_NAME\"}'"
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
            "command": "hooks-cli agent event --type tool_result --data '{\"tool\": \"$TOOL_NAME\", \"exitCode\": $EXIT_CODE}'"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "hooks-cli agent event --type session_end"
          }
        ]
      }
    ]
  }
}
```

### Verify Integration

1. Start a Claude Code session
2. Use a tool (like reading a file)
3. Check the Hooks dashboard - you should see the agent activity

---

## Setting Up Runtime Monitoring

### Step 1: Configure the Daemon

Create `~/.hooks/daemon.yaml`:

```yaml
server:
  url: http://localhost:3001
  token: hk_your_token

project:
  id: prj_your_project_id

runtimes:
  # HTTP endpoint monitoring
  - name: api-server
    type: http
    config:
      url: https://api.example.com/health
      method: GET
      expectedStatus: 200
      headers:
        Authorization: Bearer api_key
    intervalMs: 30000
    timeoutMs: 5000
    alertOnDown: true

  # TCP port monitoring
  - name: database
    type: tcp
    config:
      host: localhost
      port: 5432
    intervalMs: 60000
    timeoutMs: 3000

  # Process monitoring
  - name: nginx
    type: process
    config:
      name: nginx
    intervalMs: 30000

  # Docker container monitoring
  - name: redis-container
    type: docker
    config:
      container: redis
    intervalMs: 30000
```

### Step 2: Start the Daemon

```bash
# Link the daemon globally
npm link -w @hooks/daemon

# Start the daemon
hooks-daemon start

# Or run in foreground for debugging
hooks-daemon start --foreground
```

### Step 3: Verify Monitoring

1. Check daemon status: `hooks-daemon status`
2. View the Runtimes page in the dashboard
3. You should see health check results appearing

---

## Setting Up Cron Monitoring

### Option 1: Wrap Existing Cron Jobs

Edit your crontab:

```bash
crontab -e
```

Wrap your commands with `hooks-cli cron wrap`:

```cron
# Before:
0 * * * * /path/to/backup.sh

# After:
0 * * * * hooks-cli cron wrap --name "hourly-backup" -- /path/to/backup.sh
```

### Option 2: Manual Reporting

For more control, report events manually in your scripts:

```bash
#!/bin/bash
# backup.sh

# Report start
hooks-cli cron start --name "daily-backup"

# Run your actual backup
/usr/bin/pg_dump mydb > backup.sql
EXIT_CODE=$?

# Report end with status
if [ $EXIT_CODE -eq 0 ]; then
  hooks-cli cron end --name "daily-backup" --success
else
  hooks-cli cron end --name "daily-backup" --failed --exit-code $EXIT_CODE
fi
```

### Option 3: Using the API Directly

```bash
# Start
curl -X POST http://localhost:3001/api/v1/crons/events \
  -H "Authorization: Bearer hk_your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "jobName": "daily-backup",
    "projectId": "prj_your_project_id",
    "type": "start",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# End (success)
curl -X POST http://localhost:3001/api/v1/crons/events \
  -H "Authorization: Bearer hk_your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "jobName": "daily-backup",
    "projectId": "prj_your_project_id",
    "type": "end",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "success": true,
    "exitCode": 0
  }'
```

---

## Troubleshooting

### Server Won't Start

**Check PostgreSQL connection:**
```bash
docker-compose -f docker-compose.dev.yml logs postgres
psql $DATABASE_URL -c "SELECT 1"
```

**Check Redis connection:**
```bash
docker-compose -f docker-compose.dev.yml logs redis
redis-cli ping
```

### CLI Can't Connect

**Verify server URL:**
```bash
hooks-cli config get server.url
curl $(hooks-cli config get server.url)/health
```

**Check token validity:**
```bash
curl -H "Authorization: Bearer $(hooks-cli config get server.token)" \
  http://localhost:3001/api/v1/projects
```

### WebSocket Not Working

**Check browser console for errors**

**Verify WebSocket endpoint:**
```bash
# Using websocat
websocat ws://localhost:3001/ws
```

### Events Not Appearing

**Check event queue:**
```bash
hooks-cli status
```

**View server logs:**
```bash
docker-compose logs -f server
# Or
npm run dev -w @hooks/server  # Shows logs in terminal
```

### Dashboard Shows Stale Data

**Force refresh SWR cache:**
- Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R)
- Check WebSocket connection status in browser dev tools

### Database Migration Issues

**Reset and re-run migrations:**
```bash
# Drop and recreate database
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d

# Run migrations
npm run db:migrate -w @hooks/server
```

---

## Next Steps

- Set up alerts for critical services
- Configure notification channels (Slack, email, PagerDuty)
- Add team members to your project
- Explore the API documentation in the README

## Getting Help

- Check the [README](./README.md) for API reference
- Review the [SPEC](./SPEC.md) for detailed architecture
- Open an issue on GitHub for bugs or feature requests
