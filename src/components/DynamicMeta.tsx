import { useEffect } from 'react';
import { useSiteSettings, PRIMARY_COLOR_PRESETS } from '@/hooks/useSiteSettings';
import { useTheme } from '@/components/ThemeProvider';

/**
 * Dynamically updates <head> meta tags, injects GTM, and applies primary color
 * based on site_settings.
 */
export default function DynamicMeta() {
  const { data: settings } = useSiteSettings();
  const { theme } = useTheme();

  useEffect(() => {
    if (!settings) return;

    document.title = settings.platform_name;

    const setMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector) as HTMLMetaElement | null;
      if (el) el.content = content;
    };

    setMeta('meta[name="description"]', settings.platform_description);
    setMeta('meta[name="author"]', settings.platform_name);
    setMeta('meta[property="og:title"]', settings.platform_name);
    setMeta('meta[property="og:description"]', settings.platform_description);
  }, [settings]);

  // Apply primary color
  useEffect(() => {
    if (!settings?.primary_color) return;

    const preset = PRIMARY_COLOR_PRESETS[settings.primary_color];
    if (!preset) return;

    const isDark = theme === 'dark';
    const colors = isDark ? preset.dark : preset.light;
    const root = document.documentElement;

    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--ring', colors.ring);
    root.style.setProperty('--sidebar-primary', colors.sidebarPrimary);
    root.style.setProperty('--sidebar-accent', colors.sidebarAccent);
    root.style.setProperty('--sidebar-accent-foreground', colors.sidebarAccentFg);
    root.style.setProperty('--accent-foreground', colors.accentFg);
    root.style.setProperty('--sidebar-ring', colors.ring);
    root.style.setProperty('--chart-1', colors.chart1);
  }, [settings?.primary_color, theme]);

  // GTM dynamic injection
  useEffect(() => {
    if (!settings?.gtm_container_id) return;

    const gtmId = settings.gtm_container_id;

    if ((window as any).__GTM_LOADED === gtmId) return;

    document.querySelectorAll('script[data-gtm]').forEach(el => el.remove());

    const script = document.createElement('script');
    script.setAttribute('data-gtm', gtmId);
    script.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`;
    document.head.appendChild(script);

    const existing = document.querySelector('noscript[data-gtm]');
    if (!existing) {
      const noscript = document.createElement('noscript');
      noscript.setAttribute('data-gtm', gtmId);
      noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
      document.body.prepend(noscript);
    }

    (window as any).__GTM_LOADED = gtmId;
  }, [settings?.gtm_container_id]);

  return null;
}
