import { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'student';

export type User = SupabaseUser;
export type Session = SupabaseSession;

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  birth_date?: string;
  avatar_url?: string;
  last_seen_at?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  profileComplete: boolean | null;
  recheckProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}
