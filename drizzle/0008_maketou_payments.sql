CREATE TABLE "job_leases" (
	"name" text PRIMARY KEY NOT NULL,
	"holder" text,
	"held_until" timestamp with time zone DEFAULT now() NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_stop_reason" text
);
--> statement-breakpoint
CREATE TABLE "maketou_buyer_limits" (
	"user_id" text PRIMARY KEY NOT NULL,
	"checkout_window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"checkout_count" integer DEFAULT 0 NOT NULL,
	"last_confirm_call_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "maketou_checkouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"buyer_user_id" text NOT NULL,
	"cart_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"provider_status" text DEFAULT 'waiting_payment' NOT NULL,
	"item_key" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"payment_id" text,
	"check_attempts" integer DEFAULT 0 NOT NULL,
	"last_checked_at" timestamp with time zone,
	"failure_notified_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maketou_checkouts_cartId_unique" UNIQUE("cart_id")
);
--> statement-breakpoint
ALTER TABLE "maketou_buyer_limits" ADD CONSTRAINT "maketou_buyer_limits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maketou_checkouts" ADD CONSTRAINT "maketou_checkouts_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maketou_checkouts" ADD CONSTRAINT "maketou_checkouts_buyer_user_id_user_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maketou_checkouts_status_created_idx" ON "maketou_checkouts" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "maketou_checkouts_buyer_created_idx" ON "maketou_checkouts" USING btree ("buyer_user_id","created_at");