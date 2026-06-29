export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          name: string | null;
          goal: "general_fitness" | "lose_weight" | "run_race" | "improve_time";
          weekly_frequency: 1 | 2 | 3 | 4 | 5;
          level: "beginner" | "intermediate" | "advanced";
          onboarding_completed: boolean;
          subscription_status: "free" | "trial" | "paid";
          trial_started_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      sessions: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          planned_at: string;
          completed_at: string | null;
          status: "planned" | "completed" | "skipped";
          type: "easy" | "tempo" | "intervals" | "long" | "recovery";
          planned_distance_km: number | null;
          actual_distance_km: number | null;
          planned_duration_min: number | null;
          actual_duration_min: number | null;
          notes: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["sessions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
        };
        Insert: Omit<Database["public"]["Tables"]["messages"]["Row"], "id" | "created_at">;
        Update: never;
      };
    };
  };
}
