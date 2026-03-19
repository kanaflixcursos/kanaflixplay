ALTER TABLE public.orders
  DROP CONSTRAINT orders_combo_id_fkey,
  ADD CONSTRAINT orders_combo_id_fkey
    FOREIGN KEY (combo_id) REFERENCES public.combos(id)
    ON DELETE SET NULL;