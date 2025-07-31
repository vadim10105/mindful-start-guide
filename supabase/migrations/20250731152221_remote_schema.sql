

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."task_completion_status" AS ENUM (
    'incomplete',
    'made_progress',
    'complete'
);


ALTER TYPE "public"."task_completion_status" OWNER TO "postgres";


CREATE TYPE "public"."task_difficulty" AS ENUM (
    'easy',
    'neutral',
    'hard'
);


ALTER TYPE "public"."task_difficulty" OWNER TO "postgres";


CREATE TYPE "public"."task_list_location" AS ENUM (
    'active',
    'later',
    'collection'
);


ALTER TYPE "public"."task_list_location" OWNER TO "postgres";


CREATE TYPE "public"."task_source" AS ENUM (
    'brain_dump',
    'manual'
);


ALTER TYPE "public"."task_source" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_daily_stats"("p_user_id" "uuid", "p_date" "date", "p_tasks_completed" integer DEFAULT 0, "p_time_minutes" integer DEFAULT 0, "p_cards_collected" integer DEFAULT 0) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."update_daily_stats"("p_user_id" "uuid", "p_date" "date", "p_tasks_completed" integer, "p_time_minutes" integer, "p_cards_collected" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
      NEW.updated_at = timezone('utc'::text, now());
      RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."card_collections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "total_cards" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."card_collections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collection_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "collection_id" "uuid" NOT NULL,
    "card_number" integer NOT NULL,
    "image_url" "text" NOT NULL,
    "caption" "text",
    "attribution" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "description" "text",
    "attribution_url" "text"
);


ALTER TABLE "public"."collection_cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stat_date" "date" NOT NULL,
    "tasks_completed" integer DEFAULT 0,
    "total_time_minutes" integer DEFAULT 0,
    "cards_collected" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "task_start_preference" "text",
    "peak_energy_time" "text",
    "lowest_energy_time" "text",
    "onboarding_completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text",
    "task_preferences" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subtasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "is_done" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subtasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "public"."task_source" DEFAULT 'manual'::"public"."task_source" NOT NULL,
    "is_liked" boolean DEFAULT false,
    "is_urgent" boolean DEFAULT false,
    "is_quick" boolean DEFAULT false,
    "is_disliked" boolean DEFAULT false,
    "card_position" integer DEFAULT 1 NOT NULL,
    "completed_at" timestamp with time zone,
    "flipped_image_url" character varying(2048),
    "time_spent_minutes" integer DEFAULT 0,
    "estimated_minutes" integer,
    "list_location" "public"."task_list_location" DEFAULT 'later'::"public"."task_list_location" NOT NULL,
    "task_status" "public"."task_completion_status" DEFAULT 'incomplete'::"public"."task_completion_status" NOT NULL,
    "collection_card_id" "uuid",
    "category" "text",
    "Notes" "text"
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_card_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "collection_id" "uuid" NOT NULL,
    "cards_unlocked" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_card_progress" OWNER TO "postgres";


ALTER TABLE ONLY "public"."card_collections"
    ADD CONSTRAINT "card_collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collection_cards"
    ADD CONSTRAINT "collection_cards_collection_id_card_number_key" UNIQUE ("collection_id", "card_number");



ALTER TABLE ONLY "public"."collection_cards"
    ADD CONSTRAINT "collection_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_stats"
    ADD CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_stats"
    ADD CONSTRAINT "daily_stats_user_id_stat_date_key" UNIQUE ("user_id", "stat_date");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."subtasks"
    ADD CONSTRAINT "subtasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_card_progress"
    ADD CONSTRAINT "user_card_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_card_progress"
    ADD CONSTRAINT "user_card_progress_user_id_collection_id_key" UNIQUE ("user_id", "collection_id");



CREATE INDEX "idx_subtasks_task_id" ON "public"."subtasks" USING "btree" ("task_id");



CREATE INDEX "idx_tasks_card_position" ON "public"."tasks" USING "btree" ("card_position");



CREATE INDEX "idx_tasks_category" ON "public"."tasks" USING "btree" ("category");



CREATE INDEX "idx_tasks_collection_card_id" ON "public"."tasks" USING "btree" ("collection_card_id");



CREATE INDEX "idx_tasks_list_location" ON "public"."tasks" USING "btree" ("list_location");



CREATE INDEX "idx_tasks_task_status" ON "public"."tasks" USING "btree" ("task_status");



CREATE UNIQUE INDEX "idx_tasks_user_card_position_unique" ON "public"."tasks" USING "btree" ("user_id", "card_position") WHERE ("list_location" = 'active'::"public"."task_list_location");



CREATE INDEX "idx_tasks_user_id" ON "public"."tasks" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_daily_stats_updated_at" BEFORE UPDATE ON "public"."daily_stats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subtasks_updated_at" BEFORE UPDATE ON "public"."subtasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_card_progress_updated_at" BEFORE UPDATE ON "public"."user_card_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."collection_cards"
    ADD CONSTRAINT "collection_cards_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."card_collections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subtasks"
    ADD CONSTRAINT "subtasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_collection_card_id_fkey" FOREIGN KEY ("collection_card_id") REFERENCES "public"."collection_cards"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card_progress"
    ADD CONSTRAINT "user_card_progress_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."card_collections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card_progress"
    ADD CONSTRAINT "user_card_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Allow read access to card collections" ON "public"."card_collections" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read access to collection cards" ON "public"."collection_cards" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can create their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own subtasks" ON "public"."subtasks" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "tasks"."user_id"
   FROM "public"."tasks"
  WHERE ("tasks"."id" = "subtasks"."task_id"))));



CREATE POLICY "Users can create their own tasks" ON "public"."tasks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own subtasks" ON "public"."subtasks" FOR DELETE USING (("auth"."uid"() = ( SELECT "tasks"."user_id"
   FROM "public"."tasks"
  WHERE ("tasks"."id" = "subtasks"."task_id"))));



CREATE POLICY "Users can delete their own tasks" ON "public"."tasks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own card progress" ON "public"."user_card_progress" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own daily stats" ON "public"."daily_stats" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own card progress" ON "public"."user_card_progress" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own daily stats" ON "public"."daily_stats" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own subtasks" ON "public"."subtasks" FOR UPDATE USING (("auth"."uid"() = ( SELECT "tasks"."user_id"
   FROM "public"."tasks"
  WHERE ("tasks"."id" = "subtasks"."task_id")))) WITH CHECK (("auth"."uid"() = ( SELECT "tasks"."user_id"
   FROM "public"."tasks"
  WHERE ("tasks"."id" = "subtasks"."task_id"))));



CREATE POLICY "Users can update their own tasks" ON "public"."tasks" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own card progress" ON "public"."user_card_progress" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own daily stats" ON "public"."daily_stats" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own subtasks" ON "public"."subtasks" FOR SELECT USING (("auth"."uid"() = ( SELECT "tasks"."user_id"
   FROM "public"."tasks"
  WHERE ("tasks"."id" = "subtasks"."task_id"))));



CREATE POLICY "Users can view their own tasks" ON "public"."tasks" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."card_collections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collection_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subtasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_card_progress" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."update_daily_stats"("p_user_id" "uuid", "p_date" "date", "p_tasks_completed" integer, "p_time_minutes" integer, "p_cards_collected" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_daily_stats"("p_user_id" "uuid", "p_date" "date", "p_tasks_completed" integer, "p_time_minutes" integer, "p_cards_collected" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_daily_stats"("p_user_id" "uuid", "p_date" "date", "p_tasks_completed" integer, "p_time_minutes" integer, "p_cards_collected" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."card_collections" TO "anon";
GRANT ALL ON TABLE "public"."card_collections" TO "authenticated";
GRANT ALL ON TABLE "public"."card_collections" TO "service_role";



GRANT ALL ON TABLE "public"."collection_cards" TO "anon";
GRANT ALL ON TABLE "public"."collection_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_cards" TO "service_role";



GRANT ALL ON TABLE "public"."daily_stats" TO "anon";
GRANT ALL ON TABLE "public"."daily_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_stats" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."subtasks" TO "anon";
GRANT ALL ON TABLE "public"."subtasks" TO "authenticated";
GRANT ALL ON TABLE "public"."subtasks" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."user_card_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_card_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_card_progress" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
