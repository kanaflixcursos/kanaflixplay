-- Delete ticket reads
DELETE FROM public.support_ticket_reads WHERE ticket_id = '5a18e4da-e9c1-4855-8453-28fb88091378';

-- Delete ticket messages
DELETE FROM public.support_ticket_messages WHERE ticket_id = '5a18e4da-e9c1-4855-8453-28fb88091378';

-- Delete the ticket
DELETE FROM public.support_tickets WHERE user_id = '69f67c7c-b260-4e28-944f-07df85d1f954';
