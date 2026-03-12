ALTER TABLE "business_settings" ADD COLUMN "focus_queue_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "assigned_user_id" integer;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "escalated_at" timestamp;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
