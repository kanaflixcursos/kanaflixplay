import { useQuery } from '@tanstack/react-query';
import { fetchStudentStats } from '@/services/studentService';

export const studentKeys = {
  all: ['students'] as const,
  stats: () => ['students', 'stats'] as const,
};

export function useStudentStats() {
  return useQuery({
    queryKey: studentKeys.stats(),
    queryFn: fetchStudentStats,
    staleTime: 1000 * 60 * 2,
  });
}
