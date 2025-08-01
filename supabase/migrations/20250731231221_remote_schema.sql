drop index if exists "public"."idx_tasks_card_position";

drop index if exists "public"."idx_tasks_user_card_position_unique";

alter table "public"."tasks" drop column "Notes";

alter table "public"."tasks" drop column "card_position";

alter table "public"."tasks" add column "notes" text;

alter table "public"."tasks" add column "started_at" timestamp with time zone;


