create type "public"."task_difficulty" as enum ('easy', 'neutral', 'hard');

create type "public"."task_source" as enum ('brain_dump', 'manual', 'ai');

create type "public"."task_status" as enum ('active', 'completed', 'skipped', 'paused');

create table "public"."daily_stats" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "stat_date" date not null,
    "tasks_completed" integer default 0,
    "total_time_minutes" integer default 0,
    "cards_collected" integer default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."daily_stats" enable row level security;

create table "public"."profiles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "task_start_preference" text,
    "peak_energy_time" text,
    "lowest_energy_time" text,
    "onboarding_completed" boolean default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "display_name" text,
    "task_preferences" jsonb default '{}'::jsonb
);


alter table "public"."profiles" enable row level security;

create table "public"."subtasks" (
    "id" uuid not null default gen_random_uuid(),
    "task_id" uuid not null,
    "content" text not null,
    "is_done" boolean default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."subtasks" enable row level security;

create table "public"."tasks" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "source" task_source not null default 'manual'::task_source,
    "status" task_status not null default 'active'::task_status,
    "is_liked" boolean default false,
    "is_urgent" boolean default false,
    "is_quick" boolean default false,
    "is_disliked" boolean default false,
    "difficulty" task_difficulty default 'neutral'::task_difficulty,
    "dopamine_score" double precision,
    "ai_priority_score" double precision,
    "inferred_from_onboarding" boolean default false,
    "card_position" integer not null default 1,
    "manually_reordered" boolean default false,
    "completed_at" timestamp with time zone,
    "flipped_image_url" character varying(2048),
    "time_spent_minutes" integer default 0,
    "collection_added_at" timestamp with time zone,
    "paused_at" timestamp with time zone
);


alter table "public"."tasks" enable row level security;

CREATE UNIQUE INDEX daily_stats_pkey ON public.daily_stats USING btree (id);

CREATE UNIQUE INDEX daily_stats_user_id_stat_date_key ON public.daily_stats USING btree (user_id, stat_date);

CREATE INDEX idx_subtasks_task_id ON public.subtasks USING btree (task_id);

CREATE INDEX idx_tasks_card_position ON public.tasks USING btree (card_position);

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);

CREATE UNIQUE INDEX idx_tasks_user_card_position_unique ON public.tasks USING btree (user_id, card_position) WHERE (status = 'active'::task_status);

CREATE INDEX idx_tasks_user_id ON public.tasks USING btree (user_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX subtasks_pkey ON public.subtasks USING btree (id);

CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id);

alter table "public"."daily_stats" add constraint "daily_stats_pkey" PRIMARY KEY using index "daily_stats_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."subtasks" add constraint "subtasks_pkey" PRIMARY KEY using index "subtasks_pkey";

alter table "public"."tasks" add constraint "tasks_pkey" PRIMARY KEY using index "tasks_pkey";

alter table "public"."daily_stats" add constraint "daily_stats_user_id_stat_date_key" UNIQUE using index "daily_stats_user_id_stat_date_key";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_key" UNIQUE using index "profiles_user_id_key";

alter table "public"."subtasks" add constraint "subtasks_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE not valid;

alter table "public"."subtasks" validate constraint "subtasks_task_id_fkey";

alter table "public"."tasks" add constraint "tasks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."tasks" validate constraint "tasks_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_daily_stats(p_user_id uuid, p_date date, p_tasks_completed integer DEFAULT 0, p_time_minutes integer DEFAULT 0, p_cards_collected integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.daily_stats (user_id, stat_date, tasks_completed, total_time_minutes, cards_collected)
  VALUES (p_user_id, p_date, p_tasks_completed, p_time_minutes, p_cards_collected)
  ON CONFLICT (user_id, stat_date)
  DO UPDATE SET
    tasks_completed = daily_stats.tasks_completed + p_tasks_completed,
    total_time_minutes = daily_stats.total_time_minutes + p_time_minutes,
    cards_collected = daily_stats.cards_collected + p_cards_collected,
    updated_at = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."daily_stats" to "anon";

grant insert on table "public"."daily_stats" to "anon";

grant references on table "public"."daily_stats" to "anon";

grant select on table "public"."daily_stats" to "anon";

grant trigger on table "public"."daily_stats" to "anon";

grant truncate on table "public"."daily_stats" to "anon";

grant update on table "public"."daily_stats" to "anon";

grant delete on table "public"."daily_stats" to "authenticated";

grant insert on table "public"."daily_stats" to "authenticated";

grant references on table "public"."daily_stats" to "authenticated";

grant select on table "public"."daily_stats" to "authenticated";

grant trigger on table "public"."daily_stats" to "authenticated";

grant truncate on table "public"."daily_stats" to "authenticated";

grant update on table "public"."daily_stats" to "authenticated";

grant delete on table "public"."daily_stats" to "service_role";

grant insert on table "public"."daily_stats" to "service_role";

grant references on table "public"."daily_stats" to "service_role";

grant select on table "public"."daily_stats" to "service_role";

grant trigger on table "public"."daily_stats" to "service_role";

grant truncate on table "public"."daily_stats" to "service_role";

grant update on table "public"."daily_stats" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."subtasks" to "anon";

grant insert on table "public"."subtasks" to "anon";

grant references on table "public"."subtasks" to "anon";

grant select on table "public"."subtasks" to "anon";

grant trigger on table "public"."subtasks" to "anon";

grant truncate on table "public"."subtasks" to "anon";

grant update on table "public"."subtasks" to "anon";

grant delete on table "public"."subtasks" to "authenticated";

grant insert on table "public"."subtasks" to "authenticated";

grant references on table "public"."subtasks" to "authenticated";

grant select on table "public"."subtasks" to "authenticated";

grant trigger on table "public"."subtasks" to "authenticated";

grant truncate on table "public"."subtasks" to "authenticated";

grant update on table "public"."subtasks" to "authenticated";

grant delete on table "public"."subtasks" to "service_role";

grant insert on table "public"."subtasks" to "service_role";

grant references on table "public"."subtasks" to "service_role";

grant select on table "public"."subtasks" to "service_role";

grant trigger on table "public"."subtasks" to "service_role";

grant truncate on table "public"."subtasks" to "service_role";

grant update on table "public"."subtasks" to "service_role";

grant delete on table "public"."tasks" to "anon";

grant insert on table "public"."tasks" to "anon";

grant references on table "public"."tasks" to "anon";

grant select on table "public"."tasks" to "anon";

grant trigger on table "public"."tasks" to "anon";

grant truncate on table "public"."tasks" to "anon";

grant update on table "public"."tasks" to "anon";

grant delete on table "public"."tasks" to "authenticated";

grant insert on table "public"."tasks" to "authenticated";

grant references on table "public"."tasks" to "authenticated";

grant select on table "public"."tasks" to "authenticated";

grant trigger on table "public"."tasks" to "authenticated";

grant truncate on table "public"."tasks" to "authenticated";

grant update on table "public"."tasks" to "authenticated";

grant delete on table "public"."tasks" to "service_role";

grant insert on table "public"."tasks" to "service_role";

grant references on table "public"."tasks" to "service_role";

grant select on table "public"."tasks" to "service_role";

grant trigger on table "public"."tasks" to "service_role";

grant truncate on table "public"."tasks" to "service_role";

grant update on table "public"."tasks" to "service_role";

create policy "Users can insert their own daily stats"
on "public"."daily_stats"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own daily stats"
on "public"."daily_stats"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own daily stats"
on "public"."daily_stats"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can create their own profile"
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own profile"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can create their own subtasks"
on "public"."subtasks"
as permissive
for insert
to public
with check ((auth.uid() = ( SELECT tasks.user_id
   FROM tasks
  WHERE (tasks.id = subtasks.task_id))));


create policy "Users can delete their own subtasks"
on "public"."subtasks"
as permissive
for delete
to public
using ((auth.uid() = ( SELECT tasks.user_id
   FROM tasks
  WHERE (tasks.id = subtasks.task_id))));


create policy "Users can update their own subtasks"
on "public"."subtasks"
as permissive
for update
to public
using ((auth.uid() = ( SELECT tasks.user_id
   FROM tasks
  WHERE (tasks.id = subtasks.task_id))))
with check ((auth.uid() = ( SELECT tasks.user_id
   FROM tasks
  WHERE (tasks.id = subtasks.task_id))));


create policy "Users can view their own subtasks"
on "public"."subtasks"
as permissive
for select
to public
using ((auth.uid() = ( SELECT tasks.user_id
   FROM tasks
  WHERE (tasks.id = subtasks.task_id))));


create policy "Users can create their own tasks"
on "public"."tasks"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can delete their own tasks"
on "public"."tasks"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can update their own tasks"
on "public"."tasks"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can view their own tasks"
on "public"."tasks"
as permissive
for select
to public
using ((auth.uid() = user_id));


CREATE TRIGGER update_daily_stats_updated_at BEFORE UPDATE ON public.daily_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON public.subtasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


