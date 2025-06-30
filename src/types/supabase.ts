export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      responses: {
        Row: {
          id: string
          created_at: string
          trigger_type: string
          trigger_words: string[]
          response_text: string
        }
        Insert: {
          id?: string
          created_at?: string
          trigger_type: string
          trigger_words: string[]
          response_text: string
        }
        Update: {
          id?: string
          created_at?: string
          trigger_type?: string
          trigger_words?: string[]
          response_text?: string
        }
      }
      queries: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          query_text: string
          response_text: string
          sources: Json
          notes: string | null
          tags: string[] | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          query_text: string
          response_text: string
          sources?: Json
          notes?: string | null
          tags?: string[] | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          query_text?: string
          response_text?: string
          sources?: Json
          notes?: string | null
          tags?: string[] | null
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          email: string
          name: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          created_at?: string
          email: string
          name?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
        }
      }
    }
    Functions: {
      get_cached_query: {
        Args: {
          search_query: string
          max_age_minutes?: number
        }
        Returns: {
          id: string
          created_at: string
          query_text: string
          response_text: string
          sources: Json
        }[]
      }
    }
  }
}