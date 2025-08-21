import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    debug: __DEV__,
  },
  global: {
    headers: {
      'X-Client-Info': 'ngaji-app',
    },
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: 'admin' | 'guru' | 'siswa' | 'ortu';
          type?: 'normal' | 'cadel' | 'school' | 'personal';
          organize_id?: string;
          avatar_url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          role: 'admin' | 'guru' | 'siswa' | 'ortu';
          type?: 'normal' | 'cadel' | 'school' | 'personal';
          organize_id?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: 'admin' | 'guru' | 'siswa' | 'ortu';
          type?: 'normal' | 'cadel' | 'school' | 'personal';
          organize_id?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizes: {
        Row: {
          id: string;
          name: string;
          description?: string;
          guru_id: string;
          code: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          guru_id: string;
          code: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          guru_id?: string;
          code?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      setoran: {
        Row: {
          id: string;
          siswa_id: string;
          guru_id?: string;
          organize_id?: string;
          file_url: string;
          jenis: 'hafalan' | 'murojaah';
          tanggal: string;
          status: 'pending' | 'diterima' | 'ditolak';
          catatan?: string;
          surah?: string;
          juz?: number;
          ayat_mulai?: number;
          ayat_selesai?: number;
          poin: number;
          created_at: string;
          updated_at: string;
        };
      };
      labels: {
        Row: {
          id: string;
          siswa_id: string;
          juz: number;
          tanggal: string;
          diberikan_oleh?: string;
          keterangan?: string;
          created_at: string;
        };
      };
      quizzes: {
        Row: {
          id: string;
          question: string;
          options: any;
          correct_option: string;
          poin: number;
          organize_id?: string;
          difficulty: 'mudah' | 'sedang' | 'sulit';
          category: string;
          is_active: boolean;
          created_by?: string;
          created_at: string;
        };
      };
      quiz_answers: {
        Row: {
          id: string;
          quiz_id: string;
          siswa_id: string;
          selected_option: string;
          is_correct: boolean;
          poin: number;
          answered_at: string;
        };
      };
      siswa_poin: {
        Row: {
          id: string;
          siswa_id: string;
          total_poin: number;
          poin_hafalan: number;
          poin_quiz: number;
          updated_at: string;
        };
      };
      quran_bookmarks: {
        Row: {
          id: string;
          user_id: string;
          surah_number: number;
          ayah_number: number;
          note?: string;
          created_at: string;
        };
      };
    };
  };
};