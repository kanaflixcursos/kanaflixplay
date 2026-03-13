const UTM_FIRST_KEY = 'kanaflix_utm_first';
const UTM_LAST_KEY = 'kanaflix_utm_last';
const LANDING_URL_KEY = 'kanaflix_landing_url';

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
}

const UTM_KEYS: (keyof UtmParams)[] = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

/** Extract UTM params from current URL. If no UTMs and no external referrer → 'Direto'. */
function extractUtmFromUrl(): UtmParams {
  const url = new URL(window.location.href);
  const params: UtmParams = {};

  UTM_KEYS.forEach(key => {
    const val = url.searchParams.get(key);
    if (val) params[key] = val;
  });

  // External referrer
  if (document.referrer && !document.referrer.includes(window.location.hostname)) {
    params.referrer = document.referrer;
  }

  // If no UTM source detected, interpret as direct traffic
  if (!params.utm_source && !params.referrer) {
    params.utm_source = 'Direto';
  }

  return params;
}

/** Capture UTMs: first-touch (saved once) + last-touch (always updated when new UTMs present). */
export function captureUtmParams(): void {
  const params = extractUtmFromUrl();

  // First-touch: only save if we don't have one yet
  const existing = getStoredUtm('first');
  if (!existing.utm_source) {
    localStorage.setItem(UTM_FIRST_KEY, JSON.stringify(params));
    localStorage.setItem(LANDING_URL_KEY, window.location.pathname + window.location.search);
  }

  // Last-touch: always update if URL has real UTMs (not just 'Direto' fallback)
  const url = new URL(window.location.href);
  const hasRealUtm = UTM_KEYS.some(k => url.searchParams.get(k));
  if (hasRealUtm) {
    localStorage.setItem(UTM_LAST_KEY, JSON.stringify(params));
  }
}

/** Get stored UTM params by touch type */
export function getStoredUtm(touch: 'first' | 'last' = 'first'): UtmParams {
  try {
    const key = touch === 'first' ? UTM_FIRST_KEY : UTM_LAST_KEY;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Get the landing URL captured with first-touch UTMs */
export function getStoredLandingUrl(): string | null {
  return localStorage.getItem(LANDING_URL_KEY);
}

/** Clear stored UTM data (after attribution to profile) */
export function clearStoredUtm() {
  localStorage.removeItem(UTM_FIRST_KEY);
  localStorage.removeItem(UTM_LAST_KEY);
  localStorage.removeItem(LANDING_URL_KEY);
}
