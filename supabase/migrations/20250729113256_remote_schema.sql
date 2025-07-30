drop policy "Users can create their own profile" on "public"."profiles";

drop policy "Users can update their own profile" on "public"."profiles";

drop policy "Users can view their own profile" on "public"."profiles";

alter table "public"."profiles" drop constraint "profiles_id_fkey";

drop function if exists "public"."handle_new_user"();

create table "public"."card_collections" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "total_cards" integer not null default 0,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "description" text
);


alter table "public"."card_collections" enable row level security;

create table "public"."collection_cards" (
    "id" uuid not null default gen_random_uuid(),
    "collection_id" uuid not null,
    "card_number" integer not null,
    "image_url" text not null,
    "caption" text,
    "attribution" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "description" text,
    "attribution_url" text
);


alter table "public"."collection_cards" enable row level security;

create table "public"."user_card_progress" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "collection_id" uuid not null,
    "cards_unlocked" integer not null default 0,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."user_card_progress" enable row level security;

alter table "public"."profiles" drop column "email";

alter table "public"."profiles" add column "lowest_energy_time" text;

alter table "public"."profiles" add column "onboarding_completed" boolean default false;

alter table "public"."profiles" add column "peak_energy_time" text;

alter table "public"."profiles" add column "task_start_preference" text;

alter table "public"."profiles" add column "user_id" uuid not null;

alter table "public"."profiles" alter column "created_at" set not null;

alter table "public"."profiles" alter column "id" set default gen_random_uuid();

alter table "public"."profiles" alter column "updated_at" set not null;

alter table "public"."tasks" add column "archive_position" integer;

alter table "public"."tasks" add column "archived_at" timestamp with time zone;

CREATE UNIQUE INDEX card_collections_pkey ON public.card_collections USING btree (id);

CREATE UNIQUE INDEX collection_cards_collection_id_card_number_key ON public.collection_cards USING btree (collection_id, card_number);

CREATE UNIQUE INDEX collection_cards_pkey ON public.collection_cards USING btree (id);

CREATE INDEX idx_tasks_archive_position ON public.tasks USING btree (archive_position) WHERE (archive_position IS NOT NULL);

CREATE INDEX idx_tasks_archived_at ON public.tasks USING btree (archived_at) WHERE (archived_at IS NOT NULL);

CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX user_card_progress_pkey ON public.user_card_progress USING btree (id);

CREATE UNIQUE INDEX user_card_progress_user_id_collection_id_key ON public.user_card_progress USING btree (user_id, collection_id);

alter table "public"."card_collections" add constraint "card_collections_pkey" PRIMARY KEY using index "card_collections_pkey";

alter table "public"."collection_cards" add constraint "collection_cards_pkey" PRIMARY KEY using index "collection_cards_pkey";

alter table "public"."user_card_progress" add constraint "user_card_progress_pkey" PRIMARY KEY using index "user_card_progress_pkey";

alter table "public"."collection_cards" add constraint "collection_cards_collection_id_card_number_key" UNIQUE using index "collection_cards_collection_id_card_number_key";

alter table "public"."collection_cards" add constraint "collection_cards_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES card_collections(id) ON DELETE CASCADE not valid;

alter table "public"."collection_cards" validate constraint "collection_cards_collection_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_key" UNIQUE using index "profiles_user_id_key";

alter table "public"."user_card_progress" add constraint "user_card_progress_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES card_collections(id) ON DELETE CASCADE not valid;

alter table "public"."user_card_progress" validate constraint "user_card_progress_collection_id_fkey";

alter table "public"."user_card_progress" add constraint "user_card_progress_user_id_collection_id_key" UNIQUE using index "user_card_progress_user_id_collection_id_key";

alter table "public"."user_card_progress" add constraint "user_card_progress_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_card_progress" validate constraint "user_card_progress_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
      NEW.updated_at = timezone('utc'::text, now());
      RETURN NEW;
  END;
  $function$
;

grant delete on table "public"."card_collections" to "anon";

grant insert on table "public"."card_collections" to "anon";

grant references on table "public"."card_collections" to "anon";

grant select on table "public"."card_collections" to "anon";

grant trigger on table "public"."card_collections" to "anon";

grant truncate on table "public"."card_collections" to "anon";

grant update on table "public"."card_collections" to "anon";

grant delete on table "public"."card_collections" to "authenticated";

grant insert on table "public"."card_collections" to "authenticated";

grant references on table "public"."card_collections" to "authenticated";

grant select on table "public"."card_collections" to "authenticated";

grant trigger on table "public"."card_collections" to "authenticated";

grant truncate on table "public"."card_collections" to "authenticated";

grant update on table "public"."card_collections" to "authenticated";

grant delete on table "public"."card_collections" to "service_role";

grant insert on table "public"."card_collections" to "service_role";

grant references on table "public"."card_collections" to "service_role";

grant select on table "public"."card_collections" to "service_role";

grant trigger on table "public"."card_collections" to "service_role";

grant truncate on table "public"."card_collections" to "service_role";

grant update on table "public"."card_collections" to "service_role";

grant delete on table "public"."collection_cards" to "anon";

grant insert on table "public"."collection_cards" to "anon";

grant references on table "public"."collection_cards" to "anon";

grant select on table "public"."collection_cards" to "anon";

grant trigger on table "public"."collection_cards" to "anon";

grant truncate on table "public"."collection_cards" to "anon";

grant update on table "public"."collection_cards" to "anon";

grant delete on table "public"."collection_cards" to "authenticated";

grant insert on table "public"."collection_cards" to "authenticated";

grant references on table "public"."collection_cards" to "authenticated";

grant select on table "public"."collection_cards" to "authenticated";

grant trigger on table "public"."collection_cards" to "authenticated";

grant truncate on table "public"."collection_cards" to "authenticated";

grant update on table "public"."collection_cards" to "authenticated";

grant delete on table "public"."collection_cards" to "service_role";

grant insert on table "public"."collection_cards" to "service_role";

grant references on table "public"."collection_cards" to "service_role";

grant select on table "public"."collection_cards" to "service_role";

grant trigger on table "public"."collection_cards" to "service_role";

grant truncate on table "public"."collection_cards" to "service_role";

grant update on table "public"."collection_cards" to "service_role";

grant delete on table "public"."user_card_progress" to "anon";

grant insert on table "public"."user_card_progress" to "anon";

grant references on table "public"."user_card_progress" to "anon";

grant select on table "public"."user_card_progress" to "anon";

grant trigger on table "public"."user_card_progress" to "anon";

grant truncate on table "public"."user_card_progress" to "anon";

grant update on table "public"."user_card_progress" to "anon";

grant delete on table "public"."user_card_progress" to "authenticated";

grant insert on table "public"."user_card_progress" to "authenticated";

grant references on table "public"."user_card_progress" to "authenticated";

grant select on table "public"."user_card_progress" to "authenticated";

grant trigger on table "public"."user_card_progress" to "authenticated";

grant truncate on table "public"."user_card_progress" to "authenticated";

grant update on table "public"."user_card_progress" to "authenticated";

grant delete on table "public"."user_card_progress" to "service_role";

grant insert on table "public"."user_card_progress" to "service_role";

grant references on table "public"."user_card_progress" to "service_role";

grant select on table "public"."user_card_progress" to "service_role";

grant trigger on table "public"."user_card_progress" to "service_role";

grant truncate on table "public"."user_card_progress" to "service_role";

grant update on table "public"."user_card_progress" to "service_role";

create policy "Allow read access to card collections"
on "public"."card_collections"
as permissive
for select
to authenticated
using (true);


create policy "Allow read access to collection cards"
on "public"."collection_cards"
as permissive
for select
to authenticated
using (true);


create policy "Users can insert their own card progress"
on "public"."user_card_progress"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "Users can update their own card progress"
on "public"."user_card_progress"
as permissive
for update
to authenticated
using ((auth.uid() = user_id));


create policy "Users can view their own card progress"
on "public"."user_card_progress"
as permissive
for select
to authenticated
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


CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_card_progress_updated_at BEFORE UPDATE ON public.user_card_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


