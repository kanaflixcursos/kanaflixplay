-- Delete all support-related data in correct order due to foreign key constraints

-- 1. Delete all ticket messages
DELETE FROM public.support_ticket_messages;

-- 2. Delete all ticket reads
DELETE FROM public.support_ticket_reads;

-- 3. Clear ticket_id from refund_requests (keep the refund requests but unlink from tickets)
UPDATE public.refund_requests SET ticket_id = NULL;

-- 4. Delete all support tickets
DELETE FROM public.support_tickets;