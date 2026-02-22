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
      course_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          expires_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_optional: boolean
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_optional?: boolean
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_optional?: boolean
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          is_sequential: boolean
          last_synced_at: string | null
          launch_date: string | null
          max_installments: number
          pandavideo_folder_id: string | null
          price: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          is_sequential?: boolean
          last_synced_at?: string | null
          launch_date?: string | null
          max_installments?: number
          pandavideo_folder_id?: string | null
          price?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          is_sequential?: boolean
          last_synced_at?: string | null
          launch_date?: string | null
          max_installments?: number
          pandavideo_folder_id?: string | null
          price?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupons: {
        Row: {
          code: string
          course_id: string | null
          course_ids: string[]
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          payment_methods: string[]
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          course_id?: string | null
          course_ids?: string[]
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          payment_methods?: string[]
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          course_id?: string | null
          course_ids?: string[]
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          payment_methods?: string[]
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_coupons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          created_at: string
          failed_count: number
          html_content: string
          id: string
          name: string
          open_count: number
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          target_filters: Json
          target_type: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          failed_count?: number
          html_content: string
          id?: string
          name: string
          open_count?: number
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          target_filters?: Json
          target_type?: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          failed_count?: number
          html_content?: string
          id?: string
          name?: string
          open_count?: number
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          target_filters?: Json
          target_type?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_opens: {
        Row: {
          campaign_id: string
          id: string
          opened_at: string
          recipient_email: string
        }
        Insert: {
          campaign_id: string
          id?: string
          opened_at?: string
          recipient_email: string
        }
        Update: {
          campaign_id?: string
          id?: string
          opened_at?: string
          recipient_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_opens_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_banner: {
        Row: {
          badge_text: string
          course_id: string | null
          created_at: string
          cta_text: string
          custom_description: string | null
          custom_image_url: string | null
          custom_title: string | null
          gradient_from: string
          gradient_to: string
          id: string
          is_active: boolean
          order_index: number
          updated_at: string
        }
        Insert: {
          badge_text?: string
          course_id?: string | null
          created_at?: string
          cta_text?: string
          custom_description?: string | null
          custom_image_url?: string | null
          custom_title?: string | null
          gradient_from?: string
          gradient_to?: string
          id?: string
          is_active?: boolean
          order_index?: number
          updated_at?: string
        }
        Update: {
          badge_text?: string
          course_id?: string | null
          created_at?: string
          cta_text?: string
          custom_description?: string | null
          custom_image_url?: string | null
          custom_title?: string | null
          gradient_from?: string
          gradient_to?: string
          id?: string
          is_active?: boolean
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_banner_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_users: {
        Row: {
          auth_user_id: string | null
          course_ids: string[]
          created_at: string
          email: string
          full_name: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          course_ids?: string[]
          created_at?: string
          email: string
          full_name: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          course_ids?: string[]
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_forms: {
        Row: {
          created_at: string
          description: string | null
          fields: Json
          id: string
          is_active: boolean
          name: string
          redirect_url: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name: string
          redirect_url?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name?: string
          redirect_url?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          converted_at: string | null
          created_at: string
          custom_data: Json | null
          email: string
          form_id: string | null
          id: string
          name: string | null
          phone: string | null
          source: string
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          custom_data?: Json | null
          email: string
          form_id?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          source?: string
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          custom_data?: Json | null
          email?: string
          form_id?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          source?: string
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          lesson_id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lesson_id: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "lesson_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_materials: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          lesson_id: string
          order_index: number
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          lesson_id: string
          order_index?: number
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          lesson_id?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
          watched_seconds: number | null
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
          watched_seconds?: number | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
          watched_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_hidden: boolean
          module_id: string | null
          order_index: number
          pandavideo_video_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_hidden?: boolean
          module_id?: string | null
          order_index?: number
          pandavideo_video_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_hidden?: boolean
          module_id?: string | null
          order_index?: number
          pandavideo_video_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          boleto_barcode: string | null
          boleto_due_date: string | null
          boleto_url: string | null
          coupon_id: string | null
          course_id: string | null
          created_at: string
          discount_amount: number | null
          failure_reason: string | null
          id: string
          installments: number
          pagarme_charge_id: string | null
          paid_at: string | null
          payment_method: string | null
          pix_expires_at: string | null
          pix_qr_code: string | null
          pix_qr_code_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          boleto_barcode?: string | null
          boleto_due_date?: string | null
          boleto_url?: string | null
          coupon_id?: string | null
          course_id?: string | null
          created_at?: string
          discount_amount?: number | null
          failure_reason?: string | null
          id: string
          installments?: number
          pagarme_charge_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          boleto_barcode?: string | null
          boleto_due_date?: string | null
          boleto_url?: string | null
          coupon_id?: string | null
          course_id?: string | null
          created_at?: string
          discount_amount?: number | null
          failure_reason?: string | null
          id?: string
          installments?: number
          pagarme_charge_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          order_id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          ticket_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          order_id: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          ticket_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          order_id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          ticket_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "user_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          id: string
          page_path: string
          visited_at: string
          visitor_id: string
        }
        Insert: {
          id?: string
          page_path?: string
          visited_at?: string
          visitor_id: string
        }
        Update: {
          id?: string
          page_path?: string
          visited_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_admin_reply: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_reads: {
        Row: {
          id: string
          last_read_at: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_reads_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_orders: {
        Row: {
          amount: number | null
          boleto_barcode: string | null
          boleto_due_date: string | null
          boleto_url: string | null
          course_id: string | null
          created_at: string | null
          id: string | null
          paid_at: string | null
          payment_method: string | null
          pix_expires_at: string | null
          pix_qr_code: string | null
          pix_qr_code_url: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          boleto_barcode?: string | null
          boleto_due_date?: string | null
          boleto_url?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          boleto_barcode?: string | null
          boleto_due_date?: string | null
          boleto_url?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_course_mate_profile: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          user_id: string
        }[]
      }
      get_public_lesson_count: {
        Args: { course_id_param: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student" | "professor"
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
      app_role: ["admin", "student", "professor"],
    },
  },
} as const
