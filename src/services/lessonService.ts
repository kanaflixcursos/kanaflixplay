import { supabase } from '@/integrations/supabase/client';

export interface CourseData {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  is_sequential: boolean;
  price: number;
  launch_date: string | null;
  creator_id: string;
}

export interface LessonMaterial {
  id: string;
  lesson_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface ModuleData {
  id: string;
  title: string;
  order_index: number;
  is_optional: boolean;
}

export interface LessonData {
  id: string;
  title: string;
  description: string;
  video_url: string;
  order_index: number;
  duration_minutes: number;
  is_hidden: boolean;
  completed: boolean;
  materials: LessonMaterial[];
  thumbnail_url: string | null;
  module_id: string | null;
}

export async function fetchCourseById(courseId: string): Promise<CourseData | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();
  if (error) return null;
  return data;
}

export async function checkEnrollment(userId: string, courseId: string): Promise<boolean> {
  const { data } = await supabase
    .from('course_enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();
  return !!data;
}

export async function fetchLessonsAndModules(courseId: string) {
  const [{ data: lessonsData }, { data: modulesData }] = await Promise.all([
    supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_hidden', false)
      .order('order_index'),
    supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index'),
  ]);
  return {
    lessons: (lessonsData || []) as any[],
    modules: (modulesData || []) as ModuleData[],
  };
}

export async function fetchLessonProgress(userId: string): Promise<Map<string, boolean>> {
  const { data } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed')
    .eq('user_id', userId);
  return new Map((data || []).map((p) => [p.lesson_id, p.completed]));
}

export async function fetchLessonMaterials(lessonIds: string[]): Promise<Record<string, LessonMaterial[]>> {
  if (lessonIds.length === 0) return {};
  const { data } = await supabase
    .from('lesson_materials')
    .select('*')
    .in('lesson_id', lessonIds)
    .order('order_index');

  const map: Record<string, LessonMaterial[]> = {};
  (data || []).forEach((m: LessonMaterial) => {
    if (!map[m.lesson_id]) map[m.lesson_id] = [];
    map[m.lesson_id].push(m);
  });
  return map;
}

export async function markLessonComplete(userId: string, lessonId: string): Promise<void> {
  const { error } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    );
  if (error) throw error;
}

export async function saveLessonProgress(
  userId: string,
  lessonId: string,
  watchedSeconds: number,
  completed: boolean
): Promise<void> {
  await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        watched_seconds: Math.round(watchedSeconds),
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    );
}
