CREATE TABLE "onboarding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"first_name" text NOT NULL,
	"school_level" text NOT NULL,
	"subjects" jsonb NOT NULL,
	"goal" text NOT NULL,
	"improve_subjects" jsonb NOT NULL,
	"learning_style" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_userId_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "onboarding" ADD CONSTRAINT "onboarding_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;