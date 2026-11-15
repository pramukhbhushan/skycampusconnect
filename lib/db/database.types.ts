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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      campuses: {
        Row: {
          country: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          attn: string | null
          country: string
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          attn?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          attn?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_steps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          course_id: string
          data: Json
          status: Database["public"]["Enums"]["step_status"]
          step_no: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          course_id: string
          data?: Json
          status?: Database["public"]["Enums"]["step_status"]
          step_no: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          course_id?: string
          data?: Json
          status?: Database["public"]["Enums"]["step_status"]
          step_no?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_steps_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_steps_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          actual_participants: number | null
          agreement_status:
            | Database["public"]["Enums"]["agreement_status"]
            | null
          campus_id: string | null
          client_id: string | null
          country: string
          course_type: Database["public"]["Enums"]["course_type"] | null
          created_at: string
          currency: string
          end_date: string | null
          est_participants: number | null
          format: Database["public"]["Enums"]["course_format"]
          funding_amount: number | null
          funding_sources: Database["public"]["Enums"]["funder"][]
          id: string
          journey_course_id: string | null
          journey_status: string | null
          name: string
          organizer_id: string
          start_date: string | null
          teachers: string | null
          updated_at: string
        }
        Insert: {
          actual_participants?: number | null
          agreement_status?:
            | Database["public"]["Enums"]["agreement_status"]
            | null
          campus_id?: string | null
          client_id?: string | null
          country?: string
          course_type?: Database["public"]["Enums"]["course_type"] | null
          created_at?: string
          currency?: string
          end_date?: string | null
          est_participants?: number | null
          format?: Database["public"]["Enums"]["course_format"]
          funding_amount?: number | null
          funding_sources?: Database["public"]["Enums"]["funder"][]
          id?: string
          journey_course_id?: string | null
          journey_status?: string | null
          name: string
          organizer_id: string
          start_date?: string | null
          teachers?: string | null
          updated_at?: string
        }
        Update: {
          actual_participants?: number | null
          agreement_status?:
            | Database["public"]["Enums"]["agreement_status"]
            | null
          campus_id?: string | null
          client_id?: string | null
          country?: string
          course_type?: Database["public"]["Enums"]["course_type"] | null
          created_at?: string
          currency?: string
          end_date?: string | null
          est_participants?: number | null
          format?: Database["public"]["Enums"]["course_format"]
          funding_amount?: number | null
          funding_sources?: Database["public"]["Enums"]["funder"][]
          id?: string
          journey_course_id?: string | null
          journey_status?: string | null
          name?: string
          organizer_id?: string
          start_date?: string | null
          teachers?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          course_id: string
          created_at: string
          file_name: string
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          size_bytes: number
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          file_name: string
          id?: string
          kind: Database["public"]["Enums"]["document_kind"]
          size_bytes: number
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          file_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          body: string
          course_id: string | null
          from_admin_id: string
          from_email: string
          id: string
          provider_message_id: string | null
          sent_at: string
          status: Database["public"]["Enums"]["email_status"]
          subject: string
          template_id: string | null
          to_email: string
        }
        Insert: {
          body: string
          course_id?: string | null
          from_admin_id: string
          from_email: string
          id?: string
          provider_message_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["email_status"]
          subject: string
          template_id?: string | null
          to_email: string
        }
        Update: {
          body?: string
          course_id?: string | null
          from_admin_id?: string
          from_email?: string
          id?: string
          provider_message_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string
          template_id?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_from_admin_id_fkey"
            columns: ["from_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          id: string
          key: string
          name: string
          subject: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body: string
          id?: string
          key: string
          name: string
          subject: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          id?: string
          key?: string
          name?: string
          subject?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actor_id: string | null
          at: string
          course_id: string | null
          id: number
          payload: Json
          type: string
        }
        Insert: {
          actor_id?: string | null
          at?: string
          course_id?: string | null
          id?: never
          payload?: Json
          type: string
        }
        Update: {
          actor_id?: string | null
          at?: string
          course_id?: string | null
          id?: never
          payload?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string
          data: Json
          form_type: Database["public"]["Enums"]["form_type"]
          id: string
          name: string
          owner_id: string
          schema_version: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          form_type: Database["public"]["Enums"]["form_type"]
          id?: string
          name: string
          owner_id: string
          schema_version?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          form_type?: Database["public"]["Enums"]["form_type"]
          id?: string
          name?: string
          owner_id?: string
          schema_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_request_documents: {
        Row: {
          document_id: string
          funding_request_id: string
        }
        Insert: {
          document_id: string
          funding_request_id: string
        }
        Update: {
          document_id?: string
          funding_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_request_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_request_documents_funding_request_id_fkey"
            columns: ["funding_request_id"]
            isOneToOne: false
            referencedRelation: "funding_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_requests: {
        Row: {
          course_id: string
          created_at: string
          id: string
          needed_by: string | null
          prior_funding_note: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["funding_status"]
          student_fee: number
          submitted_at: string | null
          total_funding: number | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          needed_by?: string | null
          prior_funding_note?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["funding_status"]
          student_fee?: number
          submitted_at?: string | null
          total_funding?: number | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          needed_by?: string | null
          prior_funding_note?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["funding_status"]
          student_fee?: number
          submitted_at?: string | null
          total_funding?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_requests_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_documents: {
        Row: {
          document_id: string
          invoice_id: string
        }
        Insert: {
          document_id: string
          invoice_id: string
        }
        Update: {
          document_id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_documents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          accounting_submitted_at: string | null
          amount: number | null
          base_amount: number | null
          cc_fee_applied: boolean
          client_id: string | null
          closed_at: string | null
          course_id: string
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string | null
          is_placeholder: boolean
          issued_at: string | null
          notes: string | null
          paid_at: string | null
          participants: number | null
          po_number: string | null
          quote_id: string | null
          requested_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        Insert: {
          accounting_submitted_at?: string | null
          amount?: number | null
          base_amount?: number | null
          cc_fee_applied?: boolean
          client_id?: string | null
          closed_at?: string | null
          course_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          is_placeholder?: boolean
          issued_at?: string | null
          notes?: string | null
          paid_at?: string | null
          participants?: number | null
          po_number?: string | null
          quote_id?: string | null
          requested_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Update: {
          accounting_submitted_at?: string | null
          amount?: number | null
          base_amount?: number | null
          cc_fee_applied?: boolean
          client_id?: string | null
          closed_at?: string | null
          course_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          is_placeholder?: boolean
          issued_at?: string | null
          notes?: string | null
          paid_at?: string | null
          participants?: number | null
          po_number?: string | null
          quote_id?: string | null
          requested_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          campus_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          campus_id?: string | null
          created_at?: string
          email: string
          id: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          campus_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          amount: number | null
          client_id: string | null
          course_id: string
          created_at: string
          id: string
          issued_at: string | null
          notes: string | null
          quote_number: string | null
          requested_at: string
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
          version: number
        }
        Insert: {
          amount?: number | null
          client_id?: string | null
          course_id: string
          created_at?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          quote_number?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          amount?: number | null
          client_id?: string | null
          course_id?: string
          created_at?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          quote_number?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
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
      approve_funding: {
        Args: { p_request_id: string }
        Returns: {
          course_id: string
          created_at: string
          id: string
          needed_by: string | null
          prior_funding_note: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["funding_status"]
          student_fee: number
          submitted_at: string | null
          total_funding: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "funding_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_access_course: { Args: { p_course_id: string }; Returns: boolean }
      close_invoice: {
        Args: { p_invoice_id: string }
        Returns: {
          accounting_submitted_at: string | null
          amount: number | null
          base_amount: number | null
          cc_fee_applied: boolean
          client_id: string | null
          closed_at: string | null
          course_id: string
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string | null
          is_placeholder: boolean
          issued_at: string | null
          notes: string | null
          paid_at: string | null
          participants: number | null
          po_number: string | null
          quote_id: string | null
          requested_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      course_fee: {
        Args: {
          p_participants: number
          p_pay_by_card: boolean
          p_type: Database["public"]["Enums"]["course_type"]
        }
        Returns: {
          base_amount: number
          card_fee: number
          extra_amount: number
          extra_students: number
          subtotal: number
          total: number
        }[]
      }
      create_course: {
        Args: {
          p_campus_id?: string
          p_course_type?: Database["public"]["Enums"]["course_type"]
          p_end_date?: string
          p_est_participants?: number
          p_format?: Database["public"]["Enums"]["course_format"]
          p_funding_sources?: Database["public"]["Enums"]["funder"][]
          p_name: string
          p_start_date?: string
          p_step1_data?: Json
          p_teachers?: string
        }
        Returns: string
      }
      funding_step_status: {
        Args: { p_sources: Database["public"]["Enums"]["funder"][] }
        Returns: Database["public"]["Enums"]["step_status"]
      }
      is_iahv_admin: { Args: never; Returns: boolean }
      issue_invoice_number: {
        Args: { p_invoice_id: string; p_number: string }
        Returns: {
          accounting_submitted_at: string | null
          amount: number | null
          base_amount: number | null
          cc_fee_applied: boolean
          client_id: string | null
          closed_at: string | null
          course_id: string
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string | null
          is_placeholder: boolean
          issued_at: string | null
          notes: string | null
          paid_at: string | null
          participants: number | null
          po_number: string | null
          quote_id: string | null
          requested_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      issue_quote_number: {
        Args: { p_number: string; p_quote_id: string }
        Returns: {
          amount: number | null
          client_id: string | null
          course_id: string
          created_at: string
          id: string
          issued_at: string | null
          notes: string | null
          quote_number: string | null
          requested_at: string
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "quotes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      log_admin_event: {
        Args: { p_course_id: string; p_payload?: Json; p_type: string }
        Returns: undefined
      }
      mark_invoice_paid: {
        Args: { p_invoice_id: string }
        Returns: {
          accounting_submitted_at: string | null
          amount: number | null
          base_amount: number | null
          cc_fee_applied: boolean
          client_id: string | null
          closed_at: string | null
          course_id: string
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string | null
          is_placeholder: boolean
          issued_at: string | null
          notes: string | null
          paid_at: string | null
          participants: number | null
          po_number: string | null
          quote_id: string | null
          requested_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_invoice_sent: {
        Args: { p_invoice_id: string }
        Returns: {
          accounting_submitted_at: string | null
          amount: number | null
          base_amount: number | null
          cc_fee_applied: boolean
          client_id: string | null
          closed_at: string | null
          course_id: string
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string | null
          is_placeholder: boolean
          issued_at: string | null
          notes: string | null
          paid_at: string | null
          participants: number | null
          po_number: string | null
          quote_id: string | null
          requested_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      owns_course: { Args: { p_course_id: string }; Returns: boolean }
      request_funding_info: {
        Args: { p_note: string; p_request_id: string }
        Returns: {
          course_id: string
          created_at: string
          id: string
          needed_by: string | null
          prior_funding_note: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["funding_status"]
          student_fee: number
          submitted_at: string | null
          total_funding: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "funding_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_invoice: {
        Args: {
          p_client_id: string
          p_course_id: string
          p_document_ids: string[]
          p_due_date: string
          p_notes?: string
          p_participants: number
          p_pay_by_card: boolean
          p_po_number?: string
        }
        Returns: string
      }
      require_iahv_admin: { Args: never; Returns: undefined }
      save_funding_request: {
        Args: {
          p_agreement?: Database["public"]["Enums"]["agreement_status"]
          p_course_id: string
          p_document_ids?: string[]
          p_est_participants?: number
          p_needed_by?: string
          p_prior_funding_note?: string
          p_student_fee?: number
          p_submit: boolean
          p_total_funding?: number
        }
        Returns: string
      }
      set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: {
          campus_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_accounting: { Args: { p_course_id: string }; Returns: string }
      settle_quote: {
        Args: {
          p_quote_id: string
          p_status: Database["public"]["Enums"]["quote_status"]
        }
        Returns: {
          amount: number | null
          client_id: string | null
          course_id: string
          created_at: string
          id: string
          issued_at: string | null
          notes: string | null
          quote_number: string | null
          requested_at: string
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "quotes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      storage_course_id: { Args: { p_name: string }; Returns: string }
    }
    Enums: {
      agreement_status: "yes" | "in_progress" | "no" | "not_at_this_time"
      course_format: "in_person" | "online"
      course_type: "happiness" | "premium"
      document_kind: "proof_of_funds" | "agreement" | "other"
      email_status: "queued" | "sent" | "failed"
      form_type:
        | "course"
        | "funding_request"
        | "quote_request"
        | "invoice_request"
        | "reminder_email"
      funder: "students" | "university" | "sponsor" | "donor"
      funding_status: "draft" | "submitted" | "approved" | "needs_info"
      invoice_status:
        | "requested"
        | "issued"
        | "sent_to_client"
        | "accounting_submitted"
        | "paid"
        | "closed"
        | "rejected"
      quote_status: "requested" | "issued" | "accepted" | "revised" | "expired"
      step_status:
        | "locked"
        | "todo"
        | "in_progress"
        | "waiting"
        | "done"
        | "skipped"
      user_role: "organizer" | "iahv_admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      agreement_status: ["yes", "in_progress", "no", "not_at_this_time"],
      course_format: ["in_person", "online"],
      course_type: ["happiness", "premium"],
      document_kind: ["proof_of_funds", "agreement", "other"],
      email_status: ["queued", "sent", "failed"],
      form_type: [
        "course",
        "funding_request",
        "quote_request",
        "invoice_request",
        "reminder_email",
      ],
      funder: ["students", "university", "sponsor", "donor"],
      funding_status: ["draft", "submitted", "approved", "needs_info"],
      invoice_status: [
        "requested",
        "issued",
        "sent_to_client",
        "accounting_submitted",
        "paid",
        "closed",
        "rejected",
      ],
      quote_status: ["requested", "issued", "accepted", "revised", "expired"],
      step_status: [
        "locked",
        "todo",
        "in_progress",
        "waiting",
        "done",
        "skipped",
      ],
      user_role: ["organizer", "iahv_admin"],
    },
  },
} as const
