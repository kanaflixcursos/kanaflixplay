
-- Delete duplicate checkout_abandoned events, keeping only the earliest per visitor + checkout key
DELETE FROM public.user_events
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY visitor_id, COALESCE(event_data->>'course_id', event_data->>'combo_id')
        ORDER BY created_at ASC
      ) AS rn
    FROM public.user_events
    WHERE event_type = 'checkout_abandoned'
  ) sub
  WHERE sub.rn > 1
);
