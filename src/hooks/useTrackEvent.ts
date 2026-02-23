import { supabase } from '@/integrations/supabase/client';
import { getStoredUtm } from '@/lib/utm';
import type { Json } from '@/integrations/supabase/types';

const VISITOR_KEY = 'kanaflix_visitor_id';

function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export type TrackEventType =
  | 'page_view'
  | 'signup'
  | 'login'
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_abandoned'
  | 'enrollment';

export async function trackEvent(
  eventType: TrackEventType,
  eventData: Record<string, unknown> = {},
  pagePath?: string,
  userId?: string
) {
  const visitorId = getVisitorId();
  const utm = getStoredUtm();

  await supabase.from('user_events').insert([{
    visitor_id: visitorId,
    user_id: userId || undefined,
    event_type: eventType,
    page_path: pagePath || window.location.pathname,
    event_data: eventData as unknown as Json,
    utm_source: utm.utm_source || undefined,
    utm_medium: utm.utm_medium || undefined,
    utm_campaign: utm.utm_campaign || undefined,
  }]);
}
