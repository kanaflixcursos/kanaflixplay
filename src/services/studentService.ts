import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

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
