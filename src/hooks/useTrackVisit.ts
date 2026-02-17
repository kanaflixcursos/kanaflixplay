import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
    const visitorId = getVisitorId();
    supabase
      .from('site_visits')
      .insert({ visitor_id: visitorId, page_path: pagePath })
      .then(() => {});
  }, [pagePath]);
}
