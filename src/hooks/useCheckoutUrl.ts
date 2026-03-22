import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches all creator slugs as a map { creator_id -> slug }.
 * Cached globally so it's fetched only once.
 */
export function useCreatorSlugs() {
  return useQuery({
    queryKey: ['creator-slugs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('creators')
        .select('id, slug')
        .eq('status', 'active');
      const map: Record<string, string> = {};
      (data || []).forEach(c => { map[c.id] = c.slug; });
      return map;
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
  });
}

/**
 * Builds a checkout URL for a course or combo given the creator slug.
 */
export function buildCheckoutUrl(slug: string, type: 'course' | 'combo', id: string): string {
  return type === 'combo'
    ? `/store/${slug}/checkout/combo/${id}`
    : `/store/${slug}/checkout/${id}`;
}

/**
 * Gets the checkout URL for a course given creator_id and slugs map.
 */
export function getCheckoutUrl(
  slugs: Record<string, string> | undefined,
  creatorId: string,
  type: 'course' | 'combo',
  id: string
): string {
  const slug = slugs?.[creatorId] || 'kanaflix';
  return buildCheckoutUrl(slug, type, id);
}
