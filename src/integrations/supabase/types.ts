export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          audience: string
          book_type: string
          concepts: string[] | null
          controls: Json
          created_at: string
          current_chapter_index: number
          current_subsection_index: number
          entities: string[] | null
          genre: string | null
          id: string
          outline: Json | null
          pov: string
          status: string
          subtitle: string | null
          theme: string
          title: string
          tonal_anchors: string[] | null
          tone_profile: Json
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          audience: string
          book_type: string
          concepts?: string[] | null
          controls: Json
          created_at?: string
          current_chapter_index?: number
          current_subsection_index?: number
          entities?: string[] | null
          genre?: string | null
          id?: string
          outline?: Json | null
          pov: string
          status?: string
          subtitle?: string | null
          theme: string
          title: string
          tonal_anchors?: string[] | null
          tone_profile: Json
          updated_at?: string
          user_id: string
          word_count?: number
        }
        Update: {
          audience?: string
          book_type?: string
          concepts?: string[] | null
          controls?: Json
          created_at?: string
          current_chapter_index?: number
          current_subsection_index?: number
          entities?: string[] | null
          genre?: string | null
          id?: string
          outline?: Json | null
          pov?: string
          status?: string
          subtitle?: string | null
          theme?: string
          title?: string
          tonal_anchors?: string[] | null
          tone_profile?: Json
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          completed_first_chapter: boolean
          created_at: string
          credits_limit: number
          credits_reset_at: string
          credits_used: number
          current_period_end: string | null
          daily_words_generated: number
          daily_words_reset_at: string
          full_name: string
          id: string
          last_activity_date: string | null
          onboarding_completed: boolean
          pending_plan: string | null
          pending_plan_at: string | null
          plan: string
          streak_days: number
          streak_start_date: string | null
          stripe_subscription_id: string | null
          testimonial_prompted: boolean
          total_words_written: number
          turbo_cycles_completed: number
          turbo_unlocked: boolean
          turbo_words_capacity: number
          turbo_words_remaining: number
          updated_at: string
        }
        Insert: {
          completed_first_chapter?: boolean
          created_at?: string
          credits_limit?: number
          credits_reset_at?: string
          credits_used?: number
          current_period_end?: string | null
          daily_words_generated?: number
          daily_words_reset_at?: string
          full_name?: string
          id: string
          last_activity_date?: string | null
          onboarding_completed?: boolean
          pending_plan?: string | null
          pending_plan_at?: string | null
          plan?: string
          streak_days?: number
          streak_start_date?: string | null
          stripe_subscription_id?: string | null
          testimonial_prompted?: boolean
          total_words_written?: number
          turbo_cycles_completed?: number
          turbo_unlocked?: boolean
          turbo_words_capacity?: number
          turbo_words_remaining?: number
          updated_at?: string
        }
        Update: {
          completed_first_chapter?: boolean
          created_at?: string
          credits_limit?: number
          credits_reset_at?: string
          credits_used?: number
          current_period_end?: string | null
          daily_words_generated?: number
          daily_words_reset_at?: string
          full_name?: string
          id?: string
          last_activity_date?: string | null
          onboarding_completed?: boolean
          pending_plan?: string | null
          pending_plan_at?: string | null
          plan?: string
          streak_days?: number
          streak_start_date?: string | null
          stripe_subscription_id?: string | null
          testimonial_prompted?: boolean
          total_words_written?: number
          turbo_cycles_completed?: number
          turbo_unlocked?: boolean
          turbo_words_capacity?: number
          turbo_words_remaining?: number
          updated_at?: string
        }
        Relationships: []
      }
      request_logs: {
        Row: {
          created_at: string
          function_name: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      turbo_progress: {
        Row: {
          activity_date: string
          created_at: string
          credits_used: number
          id: string
          sessions_count: number
          updated_at: string
          user_id: string
          words_written: number
        }
        Insert: {
          activity_date?: string
          created_at?: string
          credits_used?: number
          id?: string
          sessions_count?: number
          updated_at?: string
          user_id: string
          words_written?: number
        }
        Update: {
          activity_date?: string
          created_at?: string
          credits_used?: number
          id?: string
          sessions_count?: number
          updated_at?: string
          user_id?: string
          words_written?: number
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          category: string
          created_at: string
          email: string | null
          id: string
          message: string
          rating: number
          reviewed: boolean
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          email?: string | null
          id?: string
          message: string
          rating: number
          reviewed?: boolean
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          rating?: number
          reviewed?: boolean
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_deduct_word_credits: {
        Args: { _estimated_words: number; _user_id: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          _function_name: string
          _max_per_day?: number
          _max_per_hour?: number
          _user_id: string
        }
        Returns: boolean
      }
      cleanup_old_request_logs: { Args: never; Returns: undefined }
      record_writing_activity: {
        Args: { _credits: number; _user_id: string; _words: number }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
