import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

export interface StudentProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  birth_date: string | null;
  created_at: string;
  last_seen_at: string | null;
}

export interface StudentStats {
  totalStudents: number;
  activeStudents: number;
}

export async function fetchStudentStats(): Promise<StudentStats> {
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();
  const [{ count: total }, { count: active }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen_at', sevenDaysAgo),
  ]);
  return {
    totalStudents: total || 0,
    activeStudents: active || 0,
  };
}

export async function fetchRecentSignups(limit = 5): Promise<StudentProfile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, user_id, full_name, email, avatar_url, phone, birth_date, created_at, last_seen_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []) as StudentProfile[];
}
