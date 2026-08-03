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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          area_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          severity: string
          user_id: string
        }
        Insert: {
          alert_type?: string
          area_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          severity?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          area_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          severity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "parking_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_sessions: {
        Row: {
          area_id: string
          detection_count: number
          ended_at: string | null
          id: string
          mode: string
          started_at: string
        }
        Insert: {
          area_id: string
          detection_count?: number
          ended_at?: string | null
          id?: string
          mode?: string
          started_at?: string
        }
        Update: {
          area_id?: string
          detection_count?: number
          ended_at?: string | null
          id?: string
          mode?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "camera_sessions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "parking_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      parking_areas: {
        Row: {
          area_name: string
          camera_image_url: string | null
          capacity: number
          created_at: string
          demo_mode: boolean
          description: string | null
          id: string
          location: string
          parking_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_name: string
          camera_image_url?: string | null
          capacity?: number
          created_at?: string
          demo_mode?: boolean
          description?: string | null
          id?: string
          location?: string
          parking_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_name?: string
          camera_image_url?: string | null
          capacity?: number
          created_at?: string
          demo_mode?: boolean
          description?: string | null
          id?: string
          location?: string
          parking_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      parking_records: {
        Row: {
          area_id: string
          available: number
          id: string
          occupancy_percentage: number
          occupied: number
          recorded_at: string
          source: string
        }
        Insert: {
          area_id: string
          available?: number
          id?: string
          occupancy_percentage?: number
          occupied?: number
          recorded_at?: string
          source?: string
        }
        Update: {
          area_id?: string
          available?: number
          id?: string
          occupancy_percentage?: number
          occupied?: number
          recorded_at?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "parking_records_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "parking_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      parking_slots: {
        Row: {
          area_id: string
          coordinates: Json
          created_at: string
          id: string
          slot_number: string
          status: string
          updated_at: string
        }
        Insert: {
          area_id: string
          coordinates?: Json
          created_at?: string
          id?: string
          slot_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          area_id?: string
          coordinates?: Json
          created_at?: string
          id?: string
          slot_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parking_slots_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "parking_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          area_id: string
          confidence: number | null
          created_at: string
          id: string
          is_simulated: boolean
          model_version: string
          predicted_available: number
          predicted_occupancy: number
          predicted_occupied: number
          prediction_time: string
          status: string
        }
        Insert: {
          area_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          is_simulated?: boolean
          model_version?: string
          predicted_available?: number
          predicted_occupancy?: number
          predicted_occupied?: number
          prediction_time?: string
          status?: string
        }
        Update: {
          area_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          is_simulated?: boolean
          model_version?: string
          predicted_available?: number
          predicted_occupancy?: number
          predicted_occupied?: number
          prediction_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "parking_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
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
