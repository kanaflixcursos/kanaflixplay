import { supabase } from '@/lib/supabase';

export interface CourseOption {
  id: string;
  title: string;
}

export const courseService = {
  async getCourseOptions(): Promise<CourseOption[]> {
    const { data, error } = await supabase.from('courses').select('id, title').order('title');
    if (error) {
        console.error("Error fetching course options:", error);
        return [];
    }
    return data || [];
  }
}
