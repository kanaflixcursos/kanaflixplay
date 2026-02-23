const UTM_STORAGE_KEY = 'kanaflix_utm';

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
}

/** Extract UTM params from the current URL and persist to localStorage (first-touch attribution) */
export function captureUtmParams(): UtmParams {
  const url = new URL(window.location.href);
  const params: UtmParams = {};

  const keys: (keyof UtmParams)[] = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  keys.forEach(key => {
    const val = url.searchParams.get(key);
    if (val) params[key] = val;
  });

  // Capture referrer on first visit
  if (document.referrer && !document.referrer.includes(window.location.hostname)) {
    params.referrer = document.referrer;
  }

  // First-touch: only save if we don't have UTM yet
  const existing = getStoredUtm();
  if (!existing.utm_source && params.utm_source) {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(params));
  }

  return params;
}

/** Get stored UTM params */
export function getStoredUtm(): UtmParams {
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Clear stored UTM (after attribution to profile) */
export function clearStoredUtm() {
  localStorage.removeItem(UTM_STORAGE_KEY);
}
