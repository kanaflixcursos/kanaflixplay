-- Revert FK to RESTRICT so DB enforces integrity
ALTER TABLE public.orders
  DROP CONSTRAINT orders_combo_id_fkey,
  ADD CONSTRAINT orders_combo_id_fkey
    FOREIGN KEY (combo_id) REFERENCES public.combos(id)
    ON DELETE RESTRICT;