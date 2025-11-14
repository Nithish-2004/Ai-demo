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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analysis_results: {
        Row: {
          communication_score: number | null
          confidence_score: number | null
          created_at: string
          credibility_index: number | null
          emotion_happy: number | null
          emotion_nervous: number | null
          emotion_neutral: number | null
          eye_contact_percentage: number | null
          filler_word_count: number | null
          fluency_score: number | null
          id: string
          integrity_evidence: Json | null
          integrity_score: number | null
          interview_id: string
          keywords: string[] | null
          malpractice_flags: Json | null
          nervousness_score: number | null
          per_question_analysis: Json | null
          sentiment: string | null
          technical_score: number | null
          tone: string | null
          transcript: string | null
          verification_summary: Json | null
          words_per_minute: number | null
        }
        Insert: {
          communication_score?: number | null
          confidence_score?: number | null
          created_at?: string
          credibility_index?: number | null
          emotion_happy?: number | null
          emotion_nervous?: number | null
          emotion_neutral?: number | null
          eye_contact_percentage?: number | null
          filler_word_count?: number | null
          fluency_score?: number | null
          id?: string
          integrity_evidence?: Json | null
          integrity_score?: number | null
          interview_id: string
          keywords?: string[] | null
          malpractice_flags?: Json | null
          nervousness_score?: number | null
          per_question_analysis?: Json | null
          sentiment?: string | null
          technical_score?: number | null
          tone?: string | null
          transcript?: string | null
          verification_summary?: Json | null
          words_per_minute?: number | null
        }
        Update: {
          communication_score?: number | null
          confidence_score?: number | null
          created_at?: string
          credibility_index?: number | null
          emotion_happy?: number | null
          emotion_nervous?: number | null
          emotion_neutral?: number | null
          eye_contact_percentage?: number | null
          filler_word_count?: number | null
          fluency_score?: number | null
          id?: string
          integrity_evidence?: Json | null
          integrity_score?: number | null
          interview_id?: string
          keywords?: string[] | null
          malpractice_flags?: Json | null
          nervousness_score?: number | null
          per_question_analysis?: Json | null
          sentiment?: string | null
          technical_score?: number | null
          tone?: string | null
          transcript?: string | null
          verification_summary?: Json | null
          words_per_minute?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_results_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: true
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          id: string
          status: string
          title: string
          type: string
          uploaded_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          id?: string
          status?: string
          title?: string
          type?: string
          uploaded_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          id?: string
          status?: string
          title?: string
          type?: string
          uploaded_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_interviews: {
        Row: {
          completed_at: string | null
          credibility_index: number | null
          id: string
          integrity_status: string
          questions: Json | null
          recording_url: string | null
          resume_id: string
          secondary_camera_enabled: boolean | null
          started_at: string
          status: string
          title: string
          user_id: string
          verification_status: string | null
          violation_count: number | null
          violation_limit: number | null
        }
        Insert: {
          completed_at?: string | null
          credibility_index?: number | null
          id?: string
          integrity_status?: string
          questions?: Json | null
          recording_url?: string | null
          resume_id: string
          secondary_camera_enabled?: boolean | null
          started_at?: string
          status?: string
          title?: string
          user_id: string
          verification_status?: string | null
          violation_count?: number | null
          violation_limit?: number | null
        }
        Update: {
          completed_at?: string | null
          credibility_index?: number | null
          id?: string
          integrity_status?: string
          questions?: Json | null
          recording_url?: string | null
          resume_id?: string
          secondary_camera_enabled?: boolean | null
          started_at?: string
          status?: string
          title?: string
          user_id?: string
          verification_status?: string | null
          violation_count?: number | null
          violation_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_interviews_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_interviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_flags: {
        Row: {
          details: Json | null
          evidence_url: string | null
          flag_type: string
          id: string
          mock_interview_id: string
          severity: string
          timestamp: string | null
        }
        Insert: {
          details?: Json | null
          evidence_url?: string | null
          flag_type: string
          id?: string
          mock_interview_id: string
          severity: string
          timestamp?: string | null
        }
        Update: {
          details?: Json | null
          evidence_url?: string | null
          flag_type?: string
          id?: string
          mock_interview_id?: string
          severity?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_flags_mock_interview_id_fkey"
            columns: ["mock_interview_id"]
            isOneToOne: false
            referencedRelation: "mock_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      proctor_sessions: {
        Row: {
          ended_at: string | null
          id: string
          interventions: Json | null
          mock_interview_id: string
          notes: string | null
          proctor_user_id: string | null
          started_at: string | null
        }
        Insert: {
          ended_at?: string | null
          id?: string
          interventions?: Json | null
          mock_interview_id: string
          notes?: string | null
          proctor_user_id?: string | null
          started_at?: string | null
        }
        Update: {
          ended_at?: string | null
          id?: string
          interventions?: Json | null
          mock_interview_id?: string
          notes?: string | null
          proctor_user_id?: string | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proctor_sessions_mock_interview_id_fkey"
            columns: ["mock_interview_id"]
            isOneToOne: false
            referencedRelation: "mock_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      proctoring_logs: {
        Row: {
          created_at: string
          current_count: number | null
          details: string | null
          event_type: string
          evidence_url: string | null
          id: string
          mock_interview_id: string
          timestamp: string
          violation_increment: number | null
        }
        Insert: {
          created_at?: string
          current_count?: number | null
          details?: string | null
          event_type: string
          evidence_url?: string | null
          id?: string
          mock_interview_id: string
          timestamp?: string
          violation_increment?: number | null
        }
        Update: {
          created_at?: string
          current_count?: number | null
          details?: string | null
          event_type?: string
          evidence_url?: string | null
          id?: string
          mock_interview_id?: string
          timestamp?: string
          violation_increment?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proctoring_logs_mock_interview_id_fkey"
            columns: ["mock_interview_id"]
            isOneToOne: false
            referencedRelation: "mock_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          face_embedding: Json | null
          id: string
          name: string
          phone: string | null
          photo_id_url: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          email: string
          face_embedding?: Json | null
          id: string
          name: string
          phone?: string | null
          photo_id_url?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          email?: string
          face_embedding?: Json | null
          id?: string
          name?: string
          phone?: string | null
          photo_id_url?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      resumes: {
        Row: {
          file_url: string
          id: string
          parsed_data: Json | null
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_url: string
          id?: string
          parsed_data?: Json | null
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_url?: string
          id?: string
          parsed_data?: Json | null
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          status: string
          user_id: string
          verification_type: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          status: string
          user_id: string
          verification_type: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          status?: string
          user_id?: string
          verification_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
