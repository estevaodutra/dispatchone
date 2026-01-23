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
      campaign_groups: {
        Row: {
          added_at: string | null
          campaign_id: string
          group_jid: string
          group_name: string
          id: string
          instance_id: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          campaign_id: string
          group_jid: string
          group_name: string
          id?: string
          instance_id?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          campaign_id?: string
          group_jid?: string
          group_name?: string
          id?: string
          instance_id?: string | null
          user_id?: string
        }
        Relationships: []
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
          campaign_name: string | null
          error_message: string | null
          external_message_id: string | null
          group_campaign_id: string
          group_jid: string | null
          group_name: string | null
          id: string
          instance_id: string | null
          instance_name: string | null
          message_id: string | null
          node_order: number | null
          node_type: string | null
          payload: Json | null
          provider_response: Json | null
          recipient_phone: string | null
          response_time_ms: number | null
          sent_at: string | null
          sequence_id: string | null
          status: string | null
          user_id: string
          zaap_id: string | null
        }
        Insert: {
          campaign_name?: string | null
          error_message?: string | null
          external_message_id?: string | null
          group_campaign_id: string
          group_jid?: string | null
          group_name?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          message_id?: string | null
          node_order?: number | null
          node_type?: string | null
          payload?: Json | null
          provider_response?: Json | null
          recipient_phone?: string | null
          response_time_ms?: number | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string | null
          user_id: string
          zaap_id?: string | null
        }
        Update: {
          campaign_name?: string | null
          error_message?: string | null
          external_message_id?: string | null
          group_campaign_id?: string
          group_jid?: string | null
          group_name?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          message_id?: string | null
          node_order?: number | null
          node_type?: string | null
          payload?: Json | null
          provider_response?: Json | null
          recipient_phone?: string | null
          response_time_ms?: number | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string | null
          user_id?: string
          zaap_id?: string | null
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
          media_caption: string | null
          media_type: string | null
          media_url: string | null
          mention_member: boolean | null
          schedule: Json | null
          send_private: boolean | null
          sequence_id: string | null
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
          media_caption?: string | null
          media_type?: string | null
          media_url?: string | null
          mention_member?: boolean | null
          schedule?: Json | null
          send_private?: boolean | null
          sequence_id?: string | null
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
          media_caption?: string | null
          media_type?: string | null
          media_url?: string | null
          mention_member?: boolean | null
          schedule?: Json | null
          send_private?: boolean | null
          sequence_id?: string | null
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
          {
            foreignKeyName: "group_messages_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "message_sequences"
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
      message_sequences: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          group_campaign_id: string
          id: string
          name: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          group_campaign_id: string
          id?: string
          name: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          group_campaign_id?: string
          id?: string
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          user_id?: string
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
      sequence_connections: {
        Row: {
          condition_path: string | null
          created_at: string | null
          id: string
          sequence_id: string
          source_node_id: string
          target_node_id: string
          user_id: string
        }
        Insert: {
          condition_path?: string | null
          created_at?: string | null
          id?: string
          sequence_id: string
          source_node_id: string
          target_node_id: string
          user_id: string
        }
        Update: {
          condition_path?: string | null
          created_at?: string | null
          id?: string
          sequence_id?: string
          source_node_id?: string
          target_node_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_connections_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "message_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_connections_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "sequence_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_connections_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "sequence_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_nodes: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          node_order: number | null
          node_type: string
          position_x: number | null
          position_y: number | null
          sequence_id: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string | null
          id?: string
          node_order?: number | null
          node_type: string
          position_x?: number | null
          position_y?: number | null
          sequence_id: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          node_order?: number | null
          node_type?: string
          position_x?: number | null
          position_y?: number | null
          sequence_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_nodes_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "message_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      user_media_library: {
        Row: {
          created_at: string | null
          file_size: number | null
          filename: string
          id: string
          media_type: string
          mime_type: string | null
          public_url: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          filename: string
          id?: string
          media_type: string
          mime_type?: string | null
          public_url: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          media_type?: string
          mime_type?: string | null
          public_url?: string
          storage_path?: string
          user_id?: string
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
      webhook_configs: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          url?: string
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
