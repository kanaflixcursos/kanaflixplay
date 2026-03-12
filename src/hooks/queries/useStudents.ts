import { useQuery } from '@tanstack/react-query';
import { fetchStudentStats, fetchRecentSignups } from '@/services/studentService';

export const studentKeys = {
  all: ['students'] as const,
  stats: () => ['students', 'stats'] as const,
  recentSignups: (limit: number) => ['students', 'recentSignups', limit] as const,
};

export function useStudentStats() {
  return useQuery({
    queryKey: studentKeys.stats(),
    queryFn: fetchStudentStats,
    staleTime: 1000 * 60 * 2,
  });
}

export function useRecentSignups(limit = 5) {
  return useQuery({
    queryKey: studentKeys.recentSignups(limit),
    queryFn: () => fetchRecentSignups(limit),
    staleTime: 1000 * 60 * 2,
  });
}
