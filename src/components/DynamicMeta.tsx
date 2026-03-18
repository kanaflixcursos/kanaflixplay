import { useEffect } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

/**
 * Dynamically updates <head> meta tags and injects GTM based on site_settings.
 * Replaces the static GTM snippet in index.html.
 */
export default function DynamicMeta() {
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    if (!settings) return;

    // Update document title
    document.title = settings.platform_name;

    // Helper to set meta tag
    const setMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector) as HTMLMetaElement | null;
      if (el) el.content = content;
    };

    setMeta('meta[name="description"]', settings.platform_description);
    setMeta('meta[name="author"]', settings.platform_name);
    setMeta('meta[property="og:title"]', settings.platform_name);
    setMeta('meta[property="og:description"]', settings.platform_description);
    setMeta('meta[property="og:image"]', settings.og_image_url);
    setMeta('meta[name="twitter:site"]', settings.twitter_handle);
    setMeta('meta[name="twitter:image"]', settings.og_image_url);
  }, [settings]);

  // GTM dynamic injection
  useEffect(() => {
    if (!settings?.gtm_container_id) return;

    const gtmId = settings.gtm_container_id;

    // Skip if already loaded with same ID
    if ((window as any).__GTM_LOADED === gtmId) return;

    // Remove old GTM scripts if any
    document.querySelectorAll('script[data-gtm]').forEach(el => el.remove());

    // Inject GTM script
    const script = document.createElement('script');
    script.setAttribute('data-gtm', gtmId);
    script.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`;
    document.head.appendChild(script);

    // Inject noscript iframe
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
