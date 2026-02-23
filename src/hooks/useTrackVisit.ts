import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { captureUtmParams, getStoredUtm } from '@/lib/utm';

const VISITOR_KEY = 'kanaflix_visitor_id';

function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function useTrackVisit(pagePath: string = '/') {
  useEffect(() => {
    // Capture UTM params from URL on every page load
    captureUtmParams();

    const visitorId = getVisitorId();
    const utm = getStoredUtm();

    supabase
      .from('site_visits')
      .insert([{
        visitor_id: visitorId,
        page_path: pagePath,
        utm_source: utm.utm_source || undefined,
        utm_medium: utm.utm_medium || undefined,
        utm_campaign: utm.utm_campaign || undefined,
        utm_content: utm.utm_content || undefined,
        utm_term: utm.utm_term || undefined,
        referrer: utm.referrer || undefined,
      }])
      .then(() => {});
  }, [pagePath]);
}
