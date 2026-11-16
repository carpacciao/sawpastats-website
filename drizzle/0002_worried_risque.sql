ALTER TABLE "events" ADD COLUMN "starts_on" date;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "ends_on" date;--> statement-breakpoint
ALTER TABLE "mates" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_dates" CHECK ("events"."ends_on" >= "events"."starts_on");