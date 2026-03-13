import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { captureUtmParams } from '@/lib/utm';

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Re-capture UTMs on every SPA route change (e.g. email CTA → checkout)
    captureUtmParams();
  }, [pathname, search]);

  return null;
}
