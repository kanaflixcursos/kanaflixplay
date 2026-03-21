ALTER TABLE public.orders ADD COLUMN buyer_name text;

-- Update Laryssa's order with her name
UPDATE public.orders SET buyer_name = 'Laryssa Kataki de Oliveira Veloso' WHERE id = 'or_eYqKAyyuqfLkABRG';