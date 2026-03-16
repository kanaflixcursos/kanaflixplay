import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DesignSettings {
  primaryColor: string; // HSL string e.g. "172 55% 22%"
  fontFamily: string;
  logoLightUrl: string;
  logoDarkUrl: string;
}

const DEFAULT_SETTINGS: DesignSettings = {
  primaryColor: '172 55% 22%',
  fontFamily: 'Google Sans',
  logoLightUrl: '',
  logoDarkUrl: '',
};

// Font options available in the system
export const FONT_OPTIONS = [
  { label: 'Google Sans', value: 'Google Sans', import: "https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600&display=swap" },
  { label: 'Inter', value: 'Inter', import: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
  { label: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans', import: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" },
  { label: 'DM Sans', value: 'DM Sans', import: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" },
  { label: 'Outfit', value: 'Outfit', import: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" },
  { label: 'Manrope', value: 'Manrope', import: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" },
  { label: 'Space Grotesk', value: 'Space Grotesk', import: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" },
  { label: 'Nunito', value: 'Nunito', import: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap" },
];

// Preset color palette
export const COLOR_PRESETS = [
  { label: 'Verde Kanaflix', value: '172 55% 22%' },
  { label: 'Azul Royal', value: '221 83% 53%' },
  { label: 'Violeta', value: '262 83% 58%' },
  { label: 'Rosa', value: '330 81% 60%' },
  { label: 'Laranja', value: '25 95% 53%' },
  { label: 'Vermelho', value: '0 72% 51%' },
  { label: 'Ciano', value: '190 95% 39%' },
  { label: 'Índigo', value: '239 84% 67%' },
  { label: 'Esmeralda', value: '152 69% 41%' },
  { label: 'Âmbar', value: '38 92% 50%' },
  { label: 'Slate', value: '215 20% 35%' },
  { label: 'Preto', value: '0 0% 10%' },
];

interface DesignContextType {
  settings: DesignSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<DesignSettings>) => Promise<void>;
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);

function hslToLightVariant(hsl: string, lightness: number): string {
  const parts = hsl.split(/\s+/);
  if (parts.length >= 3) {
    return `${parts[0]} ${parts[1]} ${lightness}%`;
  }
  return hsl;
}

function applyDesignToDOM(settings: DesignSettings) {
  const root = document.documentElement;

  // Primary color variations
  root.style.setProperty('--primary', settings.primaryColor);
  root.style.setProperty('--ring', settings.primaryColor);
  root.style.setProperty('--sidebar-primary', settings.primaryColor);
  root.style.setProperty('--sidebar-ring', settings.primaryColor);
  root.style.setProperty('--chart-1', settings.primaryColor);

  // Accent foreground based on primary
  const parts = settings.primaryColor.split(/\s+/);
  if (parts.length >= 2) {
    const hue = parts[0];
    const sat = parts[1];
    root.style.setProperty('--accent-foreground', `${hue} ${sat} 13%`);
    root.style.setProperty('--sidebar-accent-foreground', `${hue} ${sat} 13%`);
    root.style.setProperty('--sidebar-accent', `${hue} 40% 97%`);
  }

  // Font family
  const fallback = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif";
  const fontStack = `'${settings.fontFamily}', ${fallback}`;
  root.style.setProperty('--font-sans', fontStack);
  document.body.style.fontFamily = fontStack;

  // Load font
  const fontOption = FONT_OPTIONS.find(f => f.value === settings.fontFamily);
  if (fontOption) {
    const existingLink = document.getElementById('design-font-link');
    if (existingLink) existingLink.remove();
    const link = document.createElement('link');
    link.id = 'design-font-link';
    link.rel = 'stylesheet';
    link.href = fontOption.import;
    document.head.appendChild(link);
  }
}

export function DesignProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DesignSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load settings from DB
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'design')
          .single();

        if (data?.value && typeof data.value === 'object') {
          const saved = data.value as Record<string, unknown>;
          const merged: DesignSettings = {
            primaryColor: (saved.primaryColor as string) || DEFAULT_SETTINGS.primaryColor,
            fontFamily: (saved.fontFamily as string) || DEFAULT_SETTINGS.fontFamily,
            logoLightUrl: (saved.logoLightUrl as string) || DEFAULT_SETTINGS.logoLightUrl,
            logoDarkUrl: (saved.logoDarkUrl as string) || DEFAULT_SETTINGS.logoDarkUrl,
          };
          setSettings(merged);
          applyDesignToDOM(merged);
        }
      } catch {
        // No settings saved yet, use defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Apply settings whenever they change
  useEffect(() => {
    if (!loading) {
      applyDesignToDOM(settings);
    }
  }, [settings, loading]);

  const updateSettings = useCallback(async (newSettings: Partial<DesignSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    applyDesignToDOM(merged);

    await supabase
      .from('site_settings')
      .upsert(
        { key: 'design', value: merged as unknown as Record<string, unknown> } as any,
        { onConflict: 'key' }
      );
  }, [settings]);

  return (
    <DesignContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </DesignContext.Provider>
  );
}

export function useDesign() {
  const ctx = useContext(DesignContext);
  if (!ctx) {
    // Return safe defaults when used outside provider (e.g. login page)
    return {
      settings: DEFAULT_SETTINGS,
      loading: false,
      updateSettings: async () => {},
    } as DesignContextType;
  }
  return ctx;
}
