import { supabase } from '@/integrations/supabase/client';

export interface CatalogCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number | null;
  category_id: string | null;
  total_duration: number;
  is_enrolled: boolean;
  points_reward: number;
}

export interface AdminCourse {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  pandavideo_folder_id: string | null;
  last_synced_at: string | null;
  price: number | null;
  category_id: string | null;
  creator_id: string;
  lessonCount: number;
  enrollmentCount: number;
  totalDurationMinutes: number;
}

export interface Category {
  id: string;
  name: string;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await supabase
    .from('course_categories')
    .select('id, name')
    .order('name');
  return data || [];
}

export async function fetchCatalogCourses(userId: string): Promise<CatalogCourse[]> {
  const [coursesRes, enrollmentsRes] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title, description, thumbnail_url, price, category_id, points_reward')
      .eq('is_published', true),
    supabase
      .from('course_enrollments')
      .select('course_id')
      .eq('user_id', userId),
  ]);

  const enrolledIds = new Set(enrollmentsRes.data?.map(e => e.course_id) || []);

  const coursesWithDuration = await Promise.all(
    (coursesRes.data || []).map(async (course) => {
      const { data: lessons } = await supabase
        .from('lessons')
        .select('duration_minutes')
        .eq('course_id', course.id);

      const total_duration = lessons?.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) || 0;

      return {
        ...course,
        total_duration,
        is_enrolled: enrolledIds.has(course.id),
      };
    })
  );

  return coursesWithDuration;
}

export async function fetchAdminCourses(): Promise<AdminCourse[]> {
  const { data: coursesData, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const coursesWithStats = await Promise.all(
    (coursesData || []).map(async (course) => {
      const [{ count: lessonCount }, { count: enrollmentCount }, { data: lessonDurations }] = await Promise.all([
        supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', course.id),
        supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('course_id', course.id),
        supabase.from('lessons').select('duration_minutes').eq('course_id', course.id),
      ]);

      const totalDurationMinutes = (lessonDurations || []).reduce((sum, lesson) => sum + (lesson.duration_minutes || 0), 0);

      return {
        ...course,
        lessonCount: lessonCount || 0,
        enrollmentCount: enrollmentCount || 0,
        totalDurationMinutes,
      };
    })
  );

  return coursesWithStats;
}

export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase.from('courses').delete().eq('id', courseId);
  if (error) throw error;
}

export async function syncPandavideoLessons(courseId?: string): Promise<{ created: number; updated: number; deleted: number }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error('Não autenticado');

  const url = courseId
    ? `https://fwytxapogblcesvyxrzt.supabase.co/functions/v1/sync-pandavideo-lessons?course_id=${courseId}`
    : `https://fwytxapogblcesvyxrzt.supabase.co/functions/v1/sync-pandavideo-lessons`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao sincronizar');

  return data;
}

export async function fetchPandaFolders(): Promise<{ id: string; name: string }[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return [];

  const response = await fetch(
    `https://fwytxapogblcesvyxrzt.supabase.co/functions/v1/pandavideo?action=folders`,
    { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return data.folders || data || [];
}
