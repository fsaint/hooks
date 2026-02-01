CREATE TABLE IF NOT EXISTS "agent_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"session_id" varchar(36) NOT NULL,
	"project_id" varchar(36) NOT NULL,
	"type" varchar(50) NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"project_id" varchar(36) NOT NULL,
	"machine_id" varchar(255) NOT NULL,
	"working_directory" text NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"last_activity_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_rules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"project_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"condition" jsonb NOT NULL,
	"channels" jsonb NOT NULL,
	"cooldown_ms" integer DEFAULT 300000 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_triggered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"project_id" varchar(36) NOT NULL,
	"type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"message" text NOT NULL,
	"runtime_id" varchar(36),
	"cron_job_id" varchar(36),
	"agent_session_id" varchar(36),
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" varchar(36),
	"acknowledged_note" text,
	"resolved_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_tokens" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"token_hash" text NOT NULL,
	"token_prefix" varchar(16) NOT NULL,
	"scopes" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cron_jobs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"project_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"schedule" varchar(100),
	"status" varchar(20) DEFAULT 'unknown' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"expected_duration_ms" integer,
	"timeout" integer,
	"max_runtime" integer,
	"alert_on_failure" boolean DEFAULT true NOT NULL,
	"alert_on_missed" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"next_expected_run" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cron_runs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"job_id" varchar(36) NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"last_heartbeat_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"success" boolean,
	"exit_code" integer,
	"duration_ms" integer,
	"output" text,
	"error" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "health_checks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"runtime_id" varchar(36) NOT NULL,
	"success" boolean NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"response_time_ms" integer,
	"status_code" integer,
	"error_message" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_members" (
	"project_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"owner_id" varchar(36) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "runtimes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"project_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"config" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'unknown' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"interval_ms" integer DEFAULT 30000 NOT NULL,
	"timeout_ms" integer DEFAULT 10000 NOT NULL,
	"alert_on_down" boolean DEFAULT true NOT NULL,
	"last_check_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_events_session_idx" ON "agent_events" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_events_project_idx" ON "agent_events" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_events_timestamp_idx" ON "agent_events" ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_sessions_project_idx" ON "agent_sessions" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_sessions_status_idx" ON "agent_sessions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_sessions_last_activity_idx" ON "agent_sessions" ("last_activity_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_rules_project_idx" ON "alert_rules" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_rules_type_idx" ON "alert_rules" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_project_idx" ON "alerts" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_status_idx" ON "alerts" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_severity_idx" ON "alerts" ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_created_at_idx" ON "alerts" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_jobs_project_idx" ON "cron_jobs" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_jobs_status_idx" ON "cron_jobs" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_jobs_project_name_idx" ON "cron_jobs" ("project_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_runs_job_idx" ON "cron_runs" ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_runs_started_at_idx" ON "cron_runs" ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_runs_job_started_at_idx" ON "cron_runs" ("job_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_checks_runtime_idx" ON "health_checks" ("runtime_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_checks_timestamp_idx" ON "health_checks" ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_checks_runtime_timestamp_idx" ON "health_checks" ("runtime_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "runtimes_project_idx" ON "runtimes" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "runtimes_status_idx" ON "runtimes" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "runtimes_project_name_idx" ON "runtimes" ("project_id","name");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "agent_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_runtime_id_runtimes_id_fk" FOREIGN KEY ("runtime_id") REFERENCES "runtimes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_cron_job_id_cron_jobs_id_fk" FOREIGN KEY ("cron_job_id") REFERENCES "cron_jobs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_agent_session_id_agent_sessions_id_fk" FOREIGN KEY ("agent_session_id") REFERENCES "agent_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cron_jobs" ADD CONSTRAINT "cron_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cron_runs" ADD CONSTRAINT "cron_runs_job_id_cron_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "cron_jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "health_checks" ADD CONSTRAINT "health_checks_runtime_id_runtimes_id_fk" FOREIGN KEY ("runtime_id") REFERENCES "runtimes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "runtimes" ADD CONSTRAINT "runtimes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
