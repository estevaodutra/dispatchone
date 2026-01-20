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
      alerts: {
        Row: {
          created_at: string | null
          description: string | null
          entity: string | null
          id: string
          read: boolean | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entity?: string | null
          id?: string
          read?: boolean | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entity?: string | null
          id?: string
          read?: boolean | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          environment: string
          id: string
          key_hash: string
          key_prefix: string
          last_four: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_four: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_four?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_logs: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          method: string
          request_body: Json | null
          response_body: Json | null
          response_time_ms: number | null
          status_code: number
          user_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method: string
          request_body?: Json | null
          response_body?: Json | null
          response_time_ms?: number | null
          status_code: number
          user_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          request_body?: Json | null
          response_body?: Json | null
          response_time_ms?: number | null
          status_code?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channel: string
          created_at: string | null
          id: string
          name: string
          sent: number | null
          status: string | null
          success_rate: number | null
          total: number | null
          user_id: string | null
        }
        Insert: {
          channel?: string
          created_at?: string | null
          id?: string
          name: string
          sent?: number | null
          status?: string | null
          success_rate?: number | null
          total?: number | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          id?: string
          name?: string
          sent?: number | null
          status?: string | null
          success_rate?: number | null
          total?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      dispatch_logs: {
        Row: {
          campaign_id: string | null
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          instance_id: string | null
          recipient: string
          status: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          instance_id?: string | null
          recipient: string
          status?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          instance_id?: string | null
          recipient?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_logs_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      group_campaigns: {
        Row: {
          config: Json | null
          created_at: string | null
          edit_permission: string | null
          group_description: string | null
          group_jid: string | null
          group_name: string | null
          group_photo_url: string | null
          id: string
          instance_id: string | null
          invite_link: string | null
          message_permission: string | null
          name: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          edit_permission?: string | null
          group_description?: string | null
          group_jid?: string | null
          group_name?: string | null
          group_photo_url?: string | null
          id?: string
          instance_id?: string | null
          invite_link?: string | null
          message_permission?: string | null
          name: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          edit_permission?: string | null
          group_description?: string | null
          group_jid?: string | null
          group_name?: string | null
          group_photo_url?: string | null
          id?: string
          instance_id?: string | null
          invite_link?: string | null
          message_permission?: string | null
          name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_campaigns_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      group_member_history: {
        Row: {
          action: string
          created_at: string | null
          group_campaign_id: string
          id: string
          member_phone: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          group_campaign_id: string
          id?: string
          member_phone: string
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          group_campaign_id?: string
          id?: string
          member_phone?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_member_history_group_campaign_id_fkey"
            columns: ["group_campaign_id"]
            isOneToOne: false
            referencedRelation: "group_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_campaign_id: string
          id: string
          is_admin: boolean | null
          joined_at: string | null
          last_message_at: string | null
          last_strike_at: string | null
          left_at: string | null
          message_count: number | null
          name: string | null
          phone: string
          profile_photo: string | null
          status: string | null
          strikes: number | null
          user_id: string
        }
        Insert: {
          group_campaign_id: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          last_message_at?: string | null
          last_strike_at?: string | null
          left_at?: string | null
          message_count?: number | null
          name?: string | null
          phone: string
          profile_photo?: string | null
          status?: string | null
          strikes?: number | null
          user_id: string
        }
        Update: {
          group_campaign_id?: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          last_message_at?: string | null
          last_strike_at?: string | null
          left_at?: string | null
          message_count?: number | null
          name?: string | null
          phone?: string
          profile_photo?: string | null
          status?: string | null
          strikes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_campaign_id_fkey"
            columns: ["group_campaign_id"]
            isOneToOne: false
            referencedRelation: "group_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      group_message_logs: {
        Row: {
          group_campaign_id: string
          id: string
          message_id: string | null
          recipient_phone: string | null
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          group_campaign_id: string
          id?: string
          message_id?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          group_campaign_id?: string
          id?: string
          message_id?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_message_logs_group_campaign_id_fkey"
            columns: ["group_campaign_id"]
            isOneToOne: false
            referencedRelation: "group_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_message_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          active: boolean | null
          content: string
          created_at: string | null
          delay_seconds: number | null
          group_campaign_id: string
          id: string
          mention_member: boolean | null
          schedule: Json | null
          send_private: boolean | null
          sequence_order: number | null
          trigger_keyword: string | null
          type: string
          user_id: string
          variables: Json | null
        }
        Insert: {
          active?: boolean | null
          content: string
          created_at?: string | null
          delay_seconds?: number | null
          group_campaign_id: string
          id?: string
          mention_member?: boolean | null
          schedule?: Json | null
          send_private?: boolean | null
          sequence_order?: number | null
          trigger_keyword?: string | null
          type: string
          user_id: string
          variables?: Json | null
        }
        Update: {
          active?: boolean | null
          content?: string
          created_at?: string | null
          delay_seconds?: number | null
          group_campaign_id?: string
          id?: string
          mention_member?: boolean | null
          schedule?: Json | null
          send_private?: boolean | null
          sequence_order?: number | null
          trigger_keyword?: string | null
          type?: string
          user_id?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_campaign_id_fkey"
            columns: ["group_campaign_id"]
            isOneToOne: false
            referencedRelation: "group_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      group_moderation_logs: {
        Row: {
          action: string
          created_at: string | null
          group_campaign_id: string
          id: string
          member_id: string | null
          member_phone: string | null
          message_content: string | null
          reason: string | null
          rule_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          group_campaign_id: string
          id?: string
          member_id?: string | null
          member_phone?: string | null
          message_content?: string | null
          reason?: string | null
          rule_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          group_campaign_id?: string
          id?: string
          member_id?: string | null
          member_phone?: string | null
          message_content?: string | null
          reason?: string | null
          rule_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_moderation_logs_group_campaign_id_fkey"
            columns: ["group_campaign_id"]
            isOneToOne: false
            referencedRelation: "group_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_moderation_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_moderation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "group_moderation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      group_moderation_rules: {
        Row: {
          action: string
          active: boolean | null
          config: Json
          created_at: string | null
          group_campaign_id: string
          id: string
          rule_type: string
          user_id: string
        }
        Insert: {
          action: string
          active?: boolean | null
          config?: Json
          created_at?: string | null
          group_campaign_id: string
          id?: string
          rule_type: string
          user_id: string
        }
        Update: {
          action?: string
          active?: boolean | null
          config?: Json
          created_at?: string | null
          group_campaign_id?: string
          id?: string
          rule_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_moderation_rules_group_campaign_id_fkey"
            columns: ["group_campaign_id"]
            isOneToOne: false
            referencedRelation: "group_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      instances: {
        Row: {
          created_at: string | null
          external_instance_id: string | null
          external_instance_token: string | null
          id: string
          last_message_at: string | null
          messages_count: number | null
          name: string
          phone: string
          provider: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          external_instance_id?: string | null
          external_instance_token?: string | null
          id?: string
          last_message_at?: string | null
          messages_count?: number | null
          name: string
          phone: string
          provider: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          external_instance_id?: string | null
          external_instance_token?: string | null
          id?: string
          last_message_at?: string | null
          messages_count?: number | null
          name?: string
          phone?: string
          provider?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      phone_numbers: {
        Row: {
          connected: boolean
          created_at: string | null
          cycle_total: number
          cycle_used: number
          health: number
          id: string
          instance_id: string | null
          last_used_at: string | null
          number: string
          provider: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          connected?: boolean
          created_at?: string | null
          cycle_total?: number
          cycle_used?: number
          health?: number
          id?: string
          instance_id?: string | null
          last_used_at?: string | null
          number: string
          provider: string
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          connected?: boolean
          created_at?: string | null
          cycle_total?: number
          cycle_used?: number
          health?: number
          id?: string
          instance_id?: string | null
          last_used_at?: string | null
          number?: string
          provider?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      provider_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          instance_id: string
          payload: Json
          provider: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          instance_id: string
          payload?: Json
          provider: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          instance_id?: string
          payload?: Json
          provider?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
