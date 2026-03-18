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
  logo_url: string;
  primary_color: string; // HSL key like 'green', 'blue', etc.
  
  // External integrations
  gtm_container_id: string;
}

export interface ApiKeys {
  pandavideo_api_key: string;
  resend_api_key: string;
}

// Primary color presets (hue saturation lightness for light and dark)
export const PRIMARY_COLOR_PRESETS: Record<string, {
  label: string;
  hex: string;
  light: { primary: string; ring: string; sidebarPrimary: string; sidebarAccent: string; sidebarAccentFg: string; accentFg: string; chart1: string };
  dark: { primary: string; ring: string; sidebarPrimary: string; sidebarAccent: string; sidebarAccentFg: string; accentFg: string; chart1: string };
}> = {
  green: {
    label: 'Verde',
    hex: '#0A3630',
    light: { primary: '172 55% 22%', ring: '172 69% 13%', sidebarPrimary: '172 69% 13%', sidebarAccent: '172 69% 97%', sidebarAccentFg: '172 69% 13%', accentFg: '172 69% 13%', chart1: '172 69% 13%' },
    dark: { primary: '172 55% 45%', ring: '172 55% 45%', sidebarPrimary: '172 55% 45%', sidebarAccent: '172 40% 16%', sidebarAccentFg: '172 55% 50%', accentFg: '172 55% 50%', chart1: '172 55% 45%' },
  },
  blue: {
    label: 'Azul',
    hex: '#1E40AF',
    light: { primary: '224 64% 33%', ring: '224 64% 33%', sidebarPrimary: '224 64% 33%', sidebarAccent: '224 64% 97%', sidebarAccentFg: '224 64% 33%', accentFg: '224 64% 33%', chart1: '224 64% 33%' },
    dark: { primary: '224 64% 55%', ring: '224 64% 55%', sidebarPrimary: '224 64% 55%', sidebarAccent: '224 40% 16%', sidebarAccentFg: '224 64% 60%', accentFg: '224 64% 60%', chart1: '224 64% 55%' },
  },
  purple: {
    label: 'Roxo',
    hex: '#6D28D9',
    light: { primary: '263 70% 40%', ring: '263 70% 40%', sidebarPrimary: '263 70% 40%', sidebarAccent: '263 70% 97%', sidebarAccentFg: '263 70% 40%', accentFg: '263 70% 40%', chart1: '263 70% 40%' },
    dark: { primary: '263 70% 60%', ring: '263 70% 60%', sidebarPrimary: '263 70% 60%', sidebarAccent: '263 40% 16%', sidebarAccentFg: '263 70% 65%', accentFg: '263 70% 65%', chart1: '263 70% 60%' },
  },
  red: {
    label: 'Vermelho',
    hex: '#B91C1C',
    light: { primary: '0 72% 40%', ring: '0 72% 40%', sidebarPrimary: '0 72% 40%', sidebarAccent: '0 72% 97%', sidebarAccentFg: '0 72% 40%', accentFg: '0 72% 40%', chart1: '0 72% 40%' },
    dark: { primary: '0 72% 55%', ring: '0 72% 55%', sidebarPrimary: '0 72% 55%', sidebarAccent: '0 40% 16%', sidebarAccentFg: '0 72% 60%', accentFg: '0 72% 60%', chart1: '0 72% 55%' },
  },
  orange: {
    label: 'Laranja',
    hex: '#C2410C',
    light: { primary: '21 90% 40%', ring: '21 90% 40%', sidebarPrimary: '21 90% 40%', sidebarAccent: '21 90% 97%', sidebarAccentFg: '21 90% 40%', accentFg: '21 90% 40%', chart1: '21 90% 40%' },
    dark: { primary: '21 90% 55%', ring: '21 90% 55%', sidebarPrimary: '21 90% 55%', sidebarAccent: '21 40% 16%', sidebarAccentFg: '21 90% 60%', accentFg: '21 90% 60%', chart1: '21 90% 55%' },
  },
  pink: {
    label: 'Rosa',
    hex: '#BE185D',
    light: { primary: '338 76% 42%', ring: '338 76% 42%', sidebarPrimary: '338 76% 42%', sidebarAccent: '338 76% 97%', sidebarAccentFg: '338 76% 42%', accentFg: '338 76% 42%', chart1: '338 76% 42%' },
    dark: { primary: '338 76% 58%', ring: '338 76% 58%', sidebarPrimary: '338 76% 58%', sidebarAccent: '338 40% 16%', sidebarAccentFg: '338 76% 63%', accentFg: '338 76% 63%', chart1: '338 76% 58%' },
  },
};

const DEFAULT_SETTINGS: SiteSettings = {
  platform_name: 'Kanaflix Play',
  platform_description: 'Plataforma de cursos online Kanaflix',
  production_url: 'https://cursos.kanaflix.com.br',
  email_sender_name: 'Kanaflix Play',
  email_sender_address: 'noreply@cursos.kanaflix.com.br',
  footer_text: '2026 © Kanaflix Cursos - Todos os direitos reservados',
  footer_credits: 'Feito por Kanaflix Sistemas',
  logo_url: '',
  primary_color: 'green',
  gtm_container_id: 'GTM-WKP5PL9C',
};

const DEFAULT_API_KEYS: ApiKeys = {
  pandavideo_api_key: '',
  resend_api_key: '',
};

const SETTINGS_KEY = 'site_config';
const API_KEYS_KEY = 'api_keys';

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

async function fetchApiKeys(): Promise<ApiKeys> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', API_KEYS_KEY)
    .maybeSingle();

  if (error) {
    // Non-admins will get empty result due to RLS
    console.warn('Could not fetch API keys (likely not admin)');
    return DEFAULT_API_KEYS;
  }

  if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
    return { ...DEFAULT_API_KEYS, ...(data.value as Record<string, unknown>) } as ApiKeys;
  }

  return DEFAULT_API_KEYS;
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ['site-settings'],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: fetchApiKeys,
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

export function useUpdateApiKeys() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keys: ApiKeys) => {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key: API_KEYS_KEY, value: keys as unknown as Json }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
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

export { DEFAULT_SETTINGS, DEFAULT_API_KEYS };
