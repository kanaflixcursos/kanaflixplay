
CREATE OR REPLACE FUNCTION public.mark_checkout_abandoned()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT ON (cs.visitor_id, (cs.event_data->>'course_id'))
      cs.id,
      cs.visitor_id,
      cs.user_id,
      cs.page_path,
      cs.event_data,
      cs.utm_source,
      cs.utm_medium,
      cs.utm_campaign
    FROM user_events cs
    WHERE cs.event_type = 'checkout_started'
      AND cs.created_at < now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM user_events cc
        WHERE cc.event_type = 'checkout_completed'
          AND cc.visitor_id = cs.visitor_id
          AND cc.event_data->>'course_id' = cs.event_data->>'course_id'
          AND cc.created_at > cs.created_at
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_events ca
        WHERE ca.event_type = 'checkout_abandoned'
          AND ca.visitor_id = cs.visitor_id
          AND ca.event_data->>'course_id' = cs.event_data->>'course_id'
          AND ca.created_at > cs.created_at
      )
    ORDER BY cs.visitor_id, (cs.event_data->>'course_id'), cs.created_at DESC
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

    IF rec.user_id IS NOT NULL THEN
      UPDATE public.leads
      SET status = 'lost'
      WHERE email = (
        SELECT lower(COALESCE(p.email, ''))
        FROM public.profiles p WHERE p.user_id = rec.user_id LIMIT 1
      )
      AND lead_stage_priority(status) < lead_stage_priority('opportunity');
    END IF;
  END LOOP;
END;
$function$;
