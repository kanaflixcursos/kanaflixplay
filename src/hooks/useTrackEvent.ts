import { supabase } from '@/integrations/supabase/client';
import { getStoredUtm } from '@/lib/utm';
import type { Json } from '@/integrations/supabase/types';

const VISITOR_KEY = 'kanaflix_visitor_id';

export function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export type TrackEventType =
  | 'lead_captured'
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_abandoned'
  | 'enrollment';

/** Dedup key for session-level event deduplication */
function dedupKey(eventType: string, courseId?: string): string {
  return `kfx_evt_${eventType}_${courseId || 'global'}`;
}

/** Check if this event was already tracked in this session */
export function wasAlreadyTracked(eventType: string, courseId?: string): boolean {
  return sessionStorage.getItem(dedupKey(eventType, courseId)) === '1';
}

/** Mark event as tracked for this session */
function markTracked(eventType: string, courseId?: string) {
  sessionStorage.setItem(dedupKey(eventType, courseId), '1');
}

export async function trackEvent(
  eventType: TrackEventType,
  eventData: Record<string, unknown> = {},
  pagePath?: string,
  userId?: string
) {
  // Dedup checkout_started per course per session
  const courseId = eventData.course_id as string | undefined;
  if (eventType === 'checkout_started' && wasAlreadyTracked(eventType, courseId)) {
    return;
  }

  const visitorId = getVisitorId();
  const utm = getStoredUtm('first');

  const { error } = await supabase.from('user_events').insert([{
    visitor_id: visitorId,
    user_id: userId || undefined,
    event_type: eventType,
    page_path: pagePath || window.location.pathname,
    event_data: eventData as unknown as Json,
    utm_source: utm.utm_source || undefined,
    utm_medium: utm.utm_medium || undefined,
    utm_campaign: utm.utm_campaign || undefined,
  }]);

  if (!error && eventType === 'checkout_started') {
    markTracked(eventType, courseId);
  }
}

/** Link all anonymous visitor events to a known user after identification */
export async function linkVisitorToUser(visitorId: string, userId: string) {
  await supabase
    .from('user_events')
    .update({ user_id: userId })
    .eq('visitor_id', visitorId)
    .is('user_id', null);
}
