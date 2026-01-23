-- Schedule the sync job to run every 5 minutes
SELECT cron.schedule(
  'sync-pandavideo-lessons',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://fwytxapogblcesvyxrzt.supabase.co/functions/v1/sync-pandavideo-lessons?cron=true',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXR4YXBvZ2JsY2Vzdnl4cnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjQ3NjQsImV4cCI6MjA4NDYwMDc2NH0.voAfjTPEs5wFp8cqnyIYpn3EvKYqM6ABiTcnaB-INrI"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);