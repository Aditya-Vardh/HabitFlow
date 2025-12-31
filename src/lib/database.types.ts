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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          username: string | null
          preferences: Json
          created_at: string
          updated_at: string
          history_started_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          username?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
          history_started_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          username?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
          history_started_at?: string | null
        }
      }
      habits: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          frequency: string
          icon: string
          color: string
          current_streak: number
          best_streak: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string
          frequency?: string
          icon?: string
          color?: string
          current_streak?: number
          best_streak?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          frequency?: string
          icon?: string
          color?: string
          current_streak?: number
          best_streak?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      habit_logs: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          date: string
          status: 'completed' | 'missed' | 'skipped'
          completed_at: string | null
          notes: string
        }
        Insert: {
          id?: string
          habit_id: string
          user_id: string
          date: string
          status: 'completed' | 'missed' | 'skipped'
          completed_at?: string | null
          notes?: string
        }
        Update: {
          id?: string
          habit_id?: string
          user_id?: string
          date?: string
          status?: 'completed' | 'missed' | 'skipped'
          completed_at?: string | null
          notes?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          priority: 'low' | 'medium' | 'high'
          status: 'pending' | 'in_progress' | 'completed'
          due_date: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string
          priority?: 'low' | 'medium' | 'high'
          status?: 'pending' | 'in_progress' | 'completed'
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          priority?: 'low' | 'medium' | 'high'
          status?: 'pending' | 'in_progress' | 'completed'
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      task_history: {
        Row: {
          id: string
          user_id: string
          task_id: string
          title: string
          description: string
          priority: 'low' | 'medium' | 'high'
          due_date: string | null
          completed_at: string
          created_at: string
          archived_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id: string
          title: string
          description?: string
          priority: 'low' | 'medium' | 'high'
          due_date?: string | null
          completed_at: string
          created_at: string
          archived_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string
          title?: string
          description?: string
          priority?: 'low' | 'medium' | 'high'
          due_date?: string | null
          completed_at?: string
          created_at?: string
          archived_at?: string
        }
      }
    }
  }
}
