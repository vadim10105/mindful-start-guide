export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      daily_stats: {
        Row: {
          cards_collected: number | null
          created_at: string
          id: string
          stat_date: string
          tasks_completed: number | null
          total_time_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cards_collected?: number | null
          created_at?: string
          id?: string
          stat_date: string
          tasks_completed?: number | null
          total_time_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cards_collected?: number | null
          created_at?: string
          id?: string
          stat_date?: string
          tasks_completed?: number | null
          total_time_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          lowest_energy_time: string | null
          onboarding_completed: boolean | null
          peak_energy_time: string | null
          task_preferences: Json | null
          task_start_preference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          lowest_energy_time?: string | null
          onboarding_completed?: boolean | null
          peak_energy_time?: string | null
          task_preferences?: Json | null
          task_start_preference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          lowest_energy_time?: string | null
          onboarding_completed?: boolean | null
          peak_energy_time?: string | null
          task_preferences?: Json | null
          task_start_preference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          content: string
          created_at: string
          id: string
          is_done: boolean | null
          task_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_done?: boolean | null
          task_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_done?: boolean | null
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          ai_priority_score: number | null
          card_position: number
          collection_added_at: string | null
          completed_at: string | null
          created_at: string
          difficulty: Database["public"]["Enums"]["task_difficulty"] | null
          dopamine_score: number | null
          flipped_image_url: string | null
          id: string
          inferred_from_onboarding: boolean | null
          is_disliked: boolean | null
          is_liked: boolean | null
          is_quick: boolean | null
          is_urgent: boolean | null
          manually_reordered: boolean | null
          paused_at: string | null
          source: Database["public"]["Enums"]["task_source"]
          status: Database["public"]["Enums"]["task_status"]
          time_spent_minutes: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_priority_score?: number | null
          card_position?: number
          collection_added_at?: string | null
          completed_at?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["task_difficulty"] | null
          dopamine_score?: number | null
          flipped_image_url?: string | null
          id?: string
          inferred_from_onboarding?: boolean | null
          is_disliked?: boolean | null
          is_liked?: boolean | null
          is_quick?: boolean | null
          is_urgent?: boolean | null
          manually_reordered?: boolean | null
          paused_at?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          status?: Database["public"]["Enums"]["task_status"]
          time_spent_minutes?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_priority_score?: number | null
          card_position?: number
          collection_added_at?: string | null
          completed_at?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["task_difficulty"] | null
          dopamine_score?: number | null
          flipped_image_url?: string | null
          id?: string
          inferred_from_onboarding?: boolean | null
          is_disliked?: boolean | null
          is_liked?: boolean | null
          is_quick?: boolean | null
          is_urgent?: boolean | null
          manually_reordered?: boolean | null
          paused_at?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          status?: Database["public"]["Enums"]["task_status"]
          time_spent_minutes?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_daily_stats: {
        Args: {
          p_user_id: string
          p_date: string
          p_tasks_completed?: number
          p_time_minutes?: number
          p_cards_collected?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      task_difficulty: "easy" | "neutral" | "hard"
      task_source: "brain_dump" | "manual" | "ai"
      task_status: "active" | "completed" | "skipped" | "paused"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      task_difficulty: ["easy", "neutral", "hard"],
      task_source: ["brain_dump", "manual", "ai"],
      task_status: ["active", "completed", "skipped", "paused"],
    },
  },
} as const
