CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"action" varchar(80) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"brand_voice" text DEFAULT 'Helpful, calm, and professional.' NOT NULL,
	"signoff_name" varchar(120) DEFAULT 'The Team' NOT NULL,
	"escalation_message" text DEFAULT 'Please contact our office so we can review the details directly.' NOT NULL,
	"allowed_promises" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"banned_phrases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notification_emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_reply_style" varchar(50) DEFAULT 'professional' NOT NULL,
	"language" varchar(20) DEFAULT 'en' NOT NULL,
	"manual_review_rules" jsonb DEFAULT '["negative_reviews","damage_claim","safety_concern"]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"vertical" varchar(80) DEFAULT 'plumbing' NOT NULL,
	"primary_phone" varchar(40),
	"website" varchar(255),
	"timezone" varchar(80) DEFAULT 'America/Los_Angeles' NOT NULL,
	"review_contact_email" varchar(255),
	"status" varchar(30) DEFAULT 'trial' NOT NULL,
	"onboarding_completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connected_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"external_account_id" varchar(255) NOT NULL,
	"access_token_encrypted" text,
	"refresh_token_encrypted" text,
	"expires_at" timestamp,
	"scope" text,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp,
	"last_error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_type" varchar(50) NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"run_after" timestamp DEFAULT now() NOT NULL,
	"locked_at" timestamp,
	"completed_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"connected_account_id" integer,
	"external_location_id" varchar(255) NOT NULL,
	"google_account_name" varchar(255),
	"name" varchar(160) NOT NULL,
	"address" text,
	"phone" varchar(40),
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"selected_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp,
	"sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"review_id" integer,
	"type" varchar(50) NOT NULL,
	"channel" varchar(30) DEFAULT 'email' NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_message_id" varchar(255),
	"sent_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reply_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"analysis_id" integer NOT NULL,
	"draft_text" text NOT NULL,
	"tone" varchar(50) DEFAULT 'professional' NOT NULL,
	"cta_type" varchar(50) DEFAULT 'none' NOT NULL,
	"safety_notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generation_reason" varchar(80) DEFAULT 'initial' NOT NULL,
	"draft_status" varchar(40) DEFAULT 'generated' NOT NULL,
	"rejected_reason" text,
	"approved_by_user_id" integer,
	"approved_at" timestamp,
	"posted_at" timestamp,
	"posted_text" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"sentiment" varchar(30) NOT NULL,
	"urgency" varchar(30) NOT NULL,
	"risk_level" varchar(30) NOT NULL,
	"issue_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text NOT NULL,
	"action_recommendation" varchar(80) NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"requires_manual_review" boolean DEFAULT false NOT NULL,
	"analysis_version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"raw_output" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"model_name" varchar(120) DEFAULT 'rules-v1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"location_id" integer NOT NULL,
	"provider" varchar(50) DEFAULT 'google_business_profile' NOT NULL,
	"external_review_id" varchar(255) NOT NULL,
	"reviewer_name" varchar(255),
	"reviewer_photo_url" text,
	"star_rating" integer NOT NULL,
	"review_text" text,
	"review_created_at" timestamp NOT NULL,
	"review_updated_at" timestamp NOT NULL,
	"owner_reply_text" text,
	"owner_reply_updated_at" timestamp,
	"has_owner_reply" boolean DEFAULT false NOT NULL,
	"source_url" text,
	"payload_hash" varchar(128) NOT NULL,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"workflow_status" varchar(40) DEFAULT 'new' NOT NULL,
	"priority" varchar(20) DEFAULT 'low' NOT NULL,
	"needs_attention" boolean DEFAULT false NOT NULL,
	"last_processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_connected_account_id_connected_accounts_id_fk" FOREIGN KEY ("connected_account_id") REFERENCES "public"."connected_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_drafts" ADD CONSTRAINT "reply_drafts_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_drafts" ADD CONSTRAINT "reply_drafts_analysis_id_review_analysis_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."review_analysis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_drafts" ADD CONSTRAINT "reply_drafts_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_analysis" ADD CONSTRAINT "review_analysis_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_business_created_idx" ON "audit_logs" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_settings_business_unique" ON "business_settings" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_team_unique" ON "businesses" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "businesses_status_idx" ON "businesses" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "connected_accounts_provider_external_unique" ON "connected_accounts" USING btree ("provider","external_account_id");--> statement-breakpoint
CREATE INDEX "connected_accounts_business_status_idx" ON "connected_accounts" USING btree ("business_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_idempotency_unique" ON "jobs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "jobs_status_run_after_idx" ON "jobs" USING btree ("status","run_after");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_business_external_unique" ON "locations" USING btree ("business_id","external_location_id");--> statement-breakpoint
CREATE INDEX "locations_business_status_idx" ON "locations" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "locations_status_last_synced_idx" ON "locations" USING btree ("status","last_synced_at");--> statement-breakpoint
CREATE INDEX "notifications_business_status_idx" ON "notifications" USING btree ("business_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "reply_drafts_review_version_unique" ON "reply_drafts" USING btree ("review_id","version");--> statement-breakpoint
CREATE INDEX "reply_drafts_review_active_idx" ON "reply_drafts" USING btree ("review_id","is_active");--> statement-breakpoint
CREATE INDEX "review_analysis_review_active_idx" ON "review_analysis" USING btree ("review_id","is_active");--> statement-breakpoint
CREATE INDEX "review_analysis_review_version_idx" ON "review_analysis" USING btree ("review_id","analysis_version");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_provider_external_location_unique" ON "reviews" USING btree ("provider","external_review_id","location_id");--> statement-breakpoint
CREATE INDEX "reviews_location_created_idx" ON "reviews" USING btree ("location_id","review_created_at");--> statement-breakpoint
CREATE INDEX "reviews_workflow_priority_idx" ON "reviews" USING btree ("workflow_status","priority");--> statement-breakpoint
CREATE INDEX "activity_logs_team_timestamp_idx" ON "activity_logs" USING btree ("team_id","timestamp");--> statement-breakpoint
CREATE INDEX "invitations_team_email_status_idx" ON "invitations" USING btree ("team_id","email","status");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_user_team_unique" ON "team_members" USING btree ("user_id","team_id");--> statement-breakpoint
CREATE INDEX "team_members_team_idx" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at");