import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { captureUtmParams, getCurrentUtmFromUrl } from '@/lib/utm';
import { trackEvent, trackSiteVisit } from '@/hooks/useTrackEvent';

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);

    // 1) Persist attribution before anything else
    captureUtmParams();

    // 2) Track top-of-funnel page visits
    const fullPath = pathname + search;
    void trackSiteVisit(fullPath);

    // 3) Register email campaign clicks when user lands with email UTMs
    const currentUtm = getCurrentUtmFromUrl();
    if (currentUtm.utm_source?.toLowerCase() === 'email') {
      void trackEvent(
        'email_clicked',
        {
          utm_campaign: currentUtm.utm_campaign || null,
          utm_medium: currentUtm.utm_medium || 'campaign',
        },
        fullPath,
      );
    }
  }, [pathname, search]);

  return null;
}
