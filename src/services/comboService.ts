import { supabase } from '@/integrations/supabase/client';

export interface Combo {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  max_installments: number;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  courses: ComboCourse[];
}

export interface ComboCourse {
  id: string;
  course_id: string;
  title: string;
  thumbnail_url: string | null;
  price: number | null;
}

export async function fetchCombos(): Promise<Combo[]> {
  const { data: combos, error } = await supabase
    .from('combos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const combosWithCourses = await Promise.all(
    (combos || []).map(async (combo: any) => {
      const { data: comboCourses } = await supabase
        .from('combo_courses')
        .select('id, course_id, courses:course_id(title, thumbnail_url, price)')
        .eq('combo_id', combo.id);

      return {
        ...combo,
        courses: (comboCourses || []).map((cc: any) => ({
          id: cc.id,
          course_id: cc.course_id,
          title: cc.courses?.title || '',
          thumbnail_url: cc.courses?.thumbnail_url || null,
          price: cc.courses?.price || null,
        })),
      };
    })
  );

  return combosWithCourses;
}

export async function fetchCombo(comboId: string): Promise<Combo | null> {
  const { data: combo, error } = await supabase
    .from('combos')
    .select('*')
    .eq('id', comboId)
    .single();

  if (error || !combo) return null;

  const { data: comboCourses } = await supabase
    .from('combo_courses')
    .select('id, course_id, courses:course_id(title, thumbnail_url, price)')
    .eq('combo_id', combo.id);

  return {
    ...combo,
    courses: (comboCourses || []).map((cc: any) => ({
      id: cc.id,
      course_id: cc.course_id,
      title: cc.courses?.title || '',
      thumbnail_url: cc.courses?.thumbnail_url || null,
      price: cc.courses?.price || null,
    })),
  } as Combo;
}

export async function saveCombo(
  comboId: string | null,
  data: {
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    price: number;
    max_installments: number;
    is_active: boolean;
    course_ids: string[];
    max_uses: number | null;
    expires_at: string | null;
  }
): Promise<string> {
  const { course_ids, ...comboData } = data;

  if (comboId) {
    const { error } = await supabase
      .from('combos')
      .update(comboData)
      .eq('id', comboId);
    if (error) throw error;

    // Sync courses: delete old, insert new
    await supabase.from('combo_courses').delete().eq('combo_id', comboId);
    if (course_ids.length > 0) {
      const { error: insertError } = await supabase
        .from('combo_courses')
        .insert(course_ids.map(cid => ({ combo_id: comboId, course_id: cid })));
      if (insertError) throw insertError;
    }
    return comboId;
  } else {
    const { data: newCombo, error } = await supabase
      .from('combos')
      .insert(comboData)
      .select('id')
      .single();
    if (error || !newCombo) throw error || new Error('Failed to create combo');

    if (course_ids.length > 0) {
      const { error: insertError } = await supabase
        .from('combo_courses')
        .insert(course_ids.map(cid => ({ combo_id: newCombo.id, course_id: cid })));
      if (insertError) throw insertError;
    }
    return newCombo.id;
  }
}

export async function deleteCombo(comboId: string): Promise<void> {
  const { error } = await supabase.from('combos').delete().eq('id', comboId);
  if (error) throw error;
}
