
SELECT cron.schedule(
  'cleanup-unconfirmed-users',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fwytxapogblcesvyxrzt.supabase.co/functions/v1/cleanup-unconfirmed-users',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXR4YXBvZ2JsY2Vzdnl4cnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjQ3NjQsImV4cCI6MjA4NDYwMDc2NH0.voAfjTPEs5wFp8cqnyIYpn3EvKYqM6ABiTcnaB-INrI"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
