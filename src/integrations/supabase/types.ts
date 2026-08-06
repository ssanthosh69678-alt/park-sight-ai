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
      bookings: {
        Row: {
          amount: number
          area_id: string
          booking_ref: string
          created_at: string
          customer_id: string
          end_time: string
          hours: number
          id: string
          notes: string | null
          payment_status: string
          slot_id: string | null
          start_time: string
          status: string
          updated_at: string
          vehicle_number: string
          vehicle_type: string
        }
        Insert: {
          amount?: number
          area_id: string
          booking_ref?: string
          created_at?: string
          customer_id: string
          end_time: string
          hours?: number
          id?: string
          notes?: string | null
          payment_status?: string
          slot_id?: string | null
          start_time: string
          status?: string
          updated_at?: string
          vehicle_number?: string
          vehicle_type?: string
        }
        Update: {
          amount?: number
          area_id?: string
          booking_ref?: string
          created_at?: string
          customer_id?: string
          end_time?: string
          hours?: number
          id?: string
          notes?: string | null
          payment_status?: string
          slot_id?: string | null
          start_time?: string
          status?: string
          updated_at?: string
          vehicle_number?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "parking_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "parking_slots"
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
      favorites: {
        Row: {
          area_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "parking_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title?: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      parking_areas: {
        Row: {
          address: string
          area_name: string
          camera_image_url: string | null
          capacity: number
          closing_time: string
          created_at: string
          demo_mode: boolean
          description: string | null
          id: string
          is_active: boolean
          latitude: number | null
          location: string
          longitude: number | null
          opening_time: string
          parking_type: string
          price_bike: number
          price_car: number
          price_daily: number
          price_hourly: number
          price_suv: number
          price_truck: number
          rating: number
          updated_at: string
          user_id: string
          vehicle_types: string[]
        }
        Insert: {
          address?: string
          area_name: string
          camera_image_url?: string | null
          capacity?: number
          closing_time?: string
          created_at?: string
          demo_mode?: boolean
          description?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          location?: string
          longitude?: number | null
          opening_time?: string
          parking_type?: string
          price_bike?: number
          price_car?: number
          price_daily?: number
          price_hourly?: number
          price_suv?: number
          price_truck?: number
          rating?: number
          updated_at?: string
          user_id: string
          vehicle_types?: string[]
        }
        Update: {
          address?: string
          area_name?: string
          camera_image_url?: string | null
          capacity?: number
          closing_time?: string
          created_at?: string
          demo_mode?: boolean
          description?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          location?: string
          longitude?: number | null
          opening_time?: string
          parking_type?: string
          price_bike?: number
          price_car?: number
          price_daily?: number
          price_hourly?: number
          price_suv?: number
          price_truck?: number
          rating?: number
          updated_at?: string
          user_id?: string
          vehicle_types?: string[]
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
          vehicle_type: string
        }
        Insert: {
          area_id: string
          coordinates?: Json
          created_at?: string
          id?: string
          slot_number: string
          status?: string
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          area_id?: string
          coordinates?: Json
          created_at?: string
          id?: string
          slot_number?: string
          status?: string
          updated_at?: string
          vehicle_type?: string
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
      payments: {
        Row: {
          amount: number
          area_id: string
          booking_id: string
          created_at: string
          currency: string
          customer_id: string
          id: string
          method: string
          paid_at: string | null
          receipt_no: string
          status: string
          transaction_ref: string
        }
        Insert: {
          amount?: number
          area_id: string
          booking_id: string
          created_at?: string
          currency?: string
          customer_id: string
          id?: string
          method?: string
          paid_at?: string | null
          receipt_no?: string
          status?: string
          transaction_ref?: string
        }
        Update: {
          amount?: number
          area_id?: string
          booking_id?: string
          created_at?: string
          currency?: string
          customer_id?: string
          id?: string
          method?: string
          paid_at?: string | null
          receipt_no?: string
          status?: string
          transaction_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "parking_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_detections: {
        Row: {
          area_id: string
          bbox: Json
          confidence: number
          detected_at: string
          id: string
          is_simulated: boolean
          session_id: string | null
          slot_id: string | null
          vehicle_class: string
        }
        Insert: {
          area_id: string
          bbox?: Json
          confidence?: number
          detected_at?: string
          id?: string
          is_simulated?: boolean
          session_id?: string | null
          slot_id?: string | null
          vehicle_class?: string
        }
        Update: {
          area_id?: string
          bbox?: Json
          confidence?: number
          detected_at?: string
          id?: string
          is_simulated?: boolean
          session_id?: string | null
          slot_id?: string | null
          vehicle_class?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_detections_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "parking_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_detections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "camera_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_detections_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "parking_slots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "customer"
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
    Enums: {
      app_role: ["owner", "customer"],
    },
  },
} as const
