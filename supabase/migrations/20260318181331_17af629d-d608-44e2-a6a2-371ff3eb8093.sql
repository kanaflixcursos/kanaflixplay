
CREATE OR REPLACE FUNCTION public.mark_checkout_abandoned()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  checkout_key text;
BEGIN
  FOR rec IN
    SELECT DISTINCT ON (cs.visitor_id, COALESCE(cs.event_data->>'course_id', cs.event_data->>'combo_id'))
      cs.id,
      cs.visitor_id,
      cs.user_id,
      cs.page_path,
      cs.event_data,
      cs.utm_source,
      cs.utm_medium,
      cs.utm_campaign,
      COALESCE(cs.event_data->>'course_id', cs.event_data->>'combo_id') AS checkout_key
    FROM user_events cs
    WHERE cs.event_type = 'checkout_started'
      AND cs.created_at < now() - interval '30 minutes'
      AND COALESCE(cs.event_data->>'course_id', cs.event_data->>'combo_id') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_events cc
        WHERE cc.event_type = 'checkout_completed'
          AND cc.visitor_id = cs.visitor_id
          AND COALESCE(cc.event_data->>'course_id', cc.event_data->>'combo_id')
            = COALESCE(cs.event_data->>'course_id', cs.event_data->>'combo_id')
          AND cc.created_at > cs.created_at
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_events ca
        WHERE ca.event_type = 'checkout_abandoned'
          AND ca.visitor_id = cs.visitor_id
          AND COALESCE(ca.event_data->>'course_id', ca.event_data->>'combo_id')
            = COALESCE(cs.event_data->>'course_id', cs.event_data->>'combo_id')
          AND ca.created_at > cs.created_at
      )
    ORDER BY cs.visitor_id, COALESCE(cs.event_data->>'course_id', cs.event_data->>'combo_id'), cs.created_at DESC
  LOOP
    INSERT INTO user_events (visitor_id, user_id, event_type, page_path, event_data, utm_source, utm_medium, utm_campaign)
    VALUES (
      rec.visitor_id,
      rec.user_id,
      'checkout_abandoned',
      rec.page_path,
      rec.event_data,
      rec.utm_source,
      rec.utm_medium,
      rec.utm_campaign
    );
  END LOOP;
END;
$function$;
