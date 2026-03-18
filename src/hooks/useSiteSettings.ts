import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface SiteSettings {
  // Branding
  platform_name: string;
  platform_description: string;
  production_url: string;
  email_sender_name: string;
  email_sender_address: string;
  footer_text: string;
  footer_credits: string;
  
  // External integrations
  gtm_container_id: string;
  
  // SEO / Meta
  og_image_url: string;
  twitter_handle: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  platform_name: 'Kanaflix Play',
  platform_description: 'Plataforma de cursos online Kanaflix',
  production_url: 'https://cursos.kanaflix.com.br',
  email_sender_name: 'Kanaflix Play',
  email_sender_address: 'noreply@cursos.kanaflix.com.br',
  footer_text: '2026 © Kanaflix Cursos - Todos os direitos reservados',
  footer_credits: 'Feito por Kanaflix Sistemas',
  gtm_container_id: 'GTM-WKP5PL9C',
  og_image_url: 'https://lovable.dev/opengraph-image-p98pqg.png',
  twitter_handle: '@Kanaflix',
};

const SETTINGS_KEY = 'site_config';

async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();

  if (error) throw error;

  if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
    return { ...DEFAULT_SETTINGS, ...(data.value as Record<string, unknown>) } as SiteSettings;
  }

  return DEFAULT_SETTINGS;
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ['site-settings'],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useUpdateSiteSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: SiteSettings) => {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key: SETTINGS_KEY, value: settings as unknown as Json }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });
}

// In-memory cache for non-hook contexts (auth redirects, etc.)
let _cachedSettings: SiteSettings | null = null;

async function fetchSiteSettingsRaw(): Promise<SiteSettings> {
  if (_cachedSettings) return _cachedSettings;
  const settings = await fetchSiteSettings();
  _cachedSettings = settings;
  return settings;
}

/** Async getter for use outside React components (auth, login, etc.) */
export async function getProductionUrl(): Promise<string> {
  if (!import.meta.env.PROD) return window.location.origin;
  const s = await fetchSiteSettingsRaw();
  return s.production_url;
}

export { DEFAULT_SETTINGS };
