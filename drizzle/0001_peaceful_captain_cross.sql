CREATE TYPE "public"."fun" AS ENUM('yes', 'normal', 'no');--> statement-breakpoint
CREATE TYPE "public"."game_mode" AS ENUM('1v4', '2v8_survivor', '2v8_killer');--> statement-breakpoint
CREATE TYPE "public"."gameplay_tag" AS ENUM('tunnel', 'slug', 'camp', 'cheater', 'fairplay');--> statement-breakpoint
CREATE TYPE "public"."hook_skip" AS ENUM('none', 'p1', 'p1_p2', 'p2_p3', 'p1_p2_p3');--> statement-breakpoint
CREATE TYPE "public"."killer_behavior" AS ENUM('ragequit', 'abandon', 'afk', 'friendly', 'ragequit_abandon');--> statement-breakpoint
CREATE TYPE "public"."party_size" AS ENUM('solo', 'duo', 'trio', 'quatuor', 'quintette', 'sextuor', 'septuor', 'octuor', 'viewers');--> statement-breakpoint
CREATE TABLE "events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "events_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "games_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"mode" "game_mode" NOT NULL,
	"event_id" integer,
	"played_at" timestamp with time zone,
	"party" "party_size",
	"map_id" integer NOT NULL,
	"killer_id" integer NOT NULL,
	"killer2_id" integer,
	"mate_id" integer,
	"gameplay" "gameplay_tag"[] DEFAULT '{}' NOT NULL,
	"ignored_survivors" smallint DEFAULT 0 NOT NULL,
	"mate_gameplay" "gameplay_tag"[] DEFAULT '{}' NOT NULL,
	"escapes" smallint NOT NULL,
	"survivor_abandons" smallint DEFAULT 0 NOT NULL,
	"killer_behavior" "killer_behavior",
	"saw_escaped" boolean,
	"hatch_escape" boolean,
	"hook_skip" "hook_skip",
	"bots" smallint,
	"generators_left" smallint NOT NULL,
	"fun" "fun",
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_counts" CHECK ("games"."escapes" between 0 and (case when mode in ('2v8_survivor', '2v8_killer') then 8 else 4 end)
        and "games"."survivor_abandons" between 0 and (case when mode in ('2v8_survivor', '2v8_killer') then 8 else 4 end)
        and "games"."generators_left" between 0 and (case when mode in ('2v8_survivor', '2v8_killer') then 8 else 5 end)
        and ("games"."bots" is null or "games"."bots" between 0 and 8)
        and "games"."ignored_survivors" between 0 and (case when mode in ('2v8_survivor', '2v8_killer') then 0 else 2 end)),
	CONSTRAINT "games_event_1v4" CHECK ("games"."event_id" is null or not mode in ('2v8_survivor', '2v8_killer')),
	CONSTRAINT "games_2v8_fields" CHECK ((mode in ('2v8_survivor', '2v8_killer')) = ("games"."killer2_id" is not null) and (mode in ('2v8_survivor', '2v8_killer')) = ("games"."bots" is not null)),
	CONSTRAINT "games_party" CHECK (case
        when mode = '2v8_killer' then "games"."party" is null
        when mode in ('2v8_survivor', '2v8_killer') then "games"."party" is not null
        else "games"."party" in ('solo', 'duo', 'trio', 'quatuor', 'viewers')
      end),
	CONSTRAINT "games_survivor_fields" CHECK ((not mode = '2v8_killer') = ("games"."saw_escaped" is not null)
        and (not mode = '2v8_killer') = ("games"."hatch_escape" is not null)
        and (not mode = '2v8_killer') = ("games"."hook_skip" is not null)),
	CONSTRAINT "games_killer_fields" CHECK (mode = '2v8_killer' or ("games"."mate_id" is null
        and cardinality("games"."mate_gameplay") = 0
        and not 'fairplay' = any("games"."gameplay"))),
	CONSTRAINT "games_survivor_only" CHECK (not mode = '2v8_killer' or "games"."killer_behavior" is null)
);
--> statement-breakpoint
CREATE TABLE "killers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "killers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"in_2v8" boolean DEFAULT false NOT NULL,
	CONSTRAINT "killers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "maps" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maps_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"in_2v8" boolean DEFAULT false NOT NULL,
	CONSTRAINT "maps_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "mates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "mates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_killer_id_killers_id_fk" FOREIGN KEY ("killer_id") REFERENCES "public"."killers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_killer2_id_killers_id_fk" FOREIGN KEY ("killer2_id") REFERENCES "public"."killers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_mate_id_mates_id_fk" FOREIGN KEY ("mate_id") REFERENCES "public"."mates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_mode_idx" ON "games" USING btree ("mode");--> statement-breakpoint
CREATE INDEX "games_map_idx" ON "games" USING btree ("map_id");--> statement-breakpoint
CREATE INDEX "games_killer_idx" ON "games" USING btree ("killer_id");--> statement-breakpoint
CREATE INDEX "games_killer2_idx" ON "games" USING btree ("killer2_id");--> statement-breakpoint
CREATE INDEX "games_event_idx" ON "games" USING btree ("event_id");