import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchCatalogCourses,
  fetchAdminCourses,
  fetchCategories,
  fetchPandaFolders,
  type CatalogCourse,
  type AdminCourse,
  type Category,
} from '@/services/courseService';

export const courseKeys = {
  all: ['courses'] as const,
  catalog: (userId: string) => ['courses', 'catalog', userId] as const,
  admin: () => ['courses', 'admin'] as const,
  categories: () => ['categories'] as const,
  pandaFolders: () => ['pandaFolders'] as const,
};

export function useCatalogCourses() {
  const { user } = useAuth();

  return useQuery<CatalogCourse[]>({
    queryKey: courseKeys.catalog(user?.id ?? ''),
    queryFn: () => fetchCatalogCourses(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAdminCourses() {
  return useQuery<AdminCourse[]>({
    queryKey: courseKeys.admin(),
    queryFn: fetchAdminCourses,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: courseKeys.categories(),
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  });
}

export function usePandaFolders() {
  return useQuery({
    queryKey: courseKeys.pandaFolders(),
    queryFn: fetchPandaFolders,
    staleTime: 1000 * 60 * 10,
  });
}

export function useInvalidateCourses() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: courseKeys.all });
}
