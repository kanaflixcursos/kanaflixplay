import { supabase } from '@/integrations/supabase/client';
import { getCurrentUtmFromUrl, getStoredUtm } from '@/lib/utm';
import type { Json } from '@/integrations/supabase/types';

const VISITOR_KEY = 'kanaflix_visitor_id';
const inFlightEventKeys = new Set<string>();

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
  | 'enrollment'
  | 'email_clicked';

/** Dedup key for session-level event deduplication */
function dedupKey(eventType: string, scope = 'global'): string {
  return `kfx_evt_${eventType}_${scope}`;
}

/** Check if this event was already tracked in this session */
export function wasAlreadyTracked(eventType: string, scope = 'global'): boolean {
  return sessionStorage.getItem(dedupKey(eventType, scope)) === '1';
}

/** Mark event as tracked for this session */
function markTracked(eventType: string, scope = 'global') {
  sessionStorage.setItem(dedupKey(eventType, scope), '1');
}

function getDedupScope(
  eventType: TrackEventType,
  eventData: Record<string, unknown>,
  resolvedPath: string,
): string | null {
  if (eventType === 'checkout_started') {
    return String(eventData.course_id || 'global');
  }

  if (eventType === 'email_clicked') {
    const campaign = String(eventData.campaign_id || eventData.utm_campaign || 'email');
    return `${campaign}:${resolvedPath}`;
  }

  return null;
}

function getAttributionForEvent() {
  const lastTouch = getStoredUtm('last');
  if (lastTouch.utm_source) return lastTouch;
  return getStoredUtm('first');
}

export async function trackEvent(
  eventType: TrackEventType,
  eventData: Record<string, unknown> = {},
  pagePath?: string,
  userId?: string,
) {
  const resolvedPath = pagePath || window.location.pathname + window.location.search;
  const scope = getDedupScope(eventType, eventData, resolvedPath);

  if (scope) {
    const key = dedupKey(eventType, scope);
    if (wasAlreadyTracked(eventType, scope) || inFlightEventKeys.has(key)) {
      return;
    }
    inFlightEventKeys.add(key);
  }

  try {
    const visitorId = getVisitorId();
    const utm = getAttributionForEvent();

    const { error } = await supabase.from('user_events').insert([
      {
        visitor_id: visitorId,
        user_id: userId || undefined,
        event_type: eventType,
        page_path: resolvedPath,
        event_data: eventData as unknown as Json,
        utm_source: utm.utm_source || undefined,
        utm_medium: utm.utm_medium || undefined,
        utm_campaign: utm.utm_campaign || undefined,
      },
    ]);

    if (!error && scope) {
      markTracked(eventType, scope);
    }
  } catch (error) {
    console.error('trackEvent error:', error);
  } finally {
    if (scope) {
      inFlightEventKeys.delete(dedupKey(eventType, scope));
    }
  }
}

/** Track raw page visits for top-of-funnel visitor analytics */
export async function trackSiteVisit(pagePath?: string) {
  try {
    const visitorId = getVisitorId();
    const current = getCurrentUtmFromUrl();
    const storedLast = getStoredUtm('last');
    const storedFirst = getStoredUtm('first');
    const activeUtm = current.utm_source ? current : (storedLast.utm_source ? storedLast : storedFirst);

    await supabase.from('site_visits').insert([
      {
        visitor_id: visitorId,
        page_path: pagePath || window.location.pathname + window.location.search,
        referrer: current.referrer || document.referrer || null,
        utm_source: activeUtm.utm_source || null,
        utm_medium: activeUtm.utm_medium || null,
        utm_campaign: activeUtm.utm_campaign || null,
        utm_content: activeUtm.utm_content || null,
        utm_term: activeUtm.utm_term || null,
      },
    ]);
  } catch (error) {
    console.error('trackSiteVisit error:', error);
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
