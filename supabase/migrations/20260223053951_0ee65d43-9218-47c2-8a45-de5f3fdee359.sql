-- Enable required extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the mark_checkout_abandoned function every 15 minutes
SELECT cron.schedule(
  'mark-checkout-abandoned',
  '*/15 * * * *',
  $$SELECT public.mark_checkout_abandoned()$$
);
