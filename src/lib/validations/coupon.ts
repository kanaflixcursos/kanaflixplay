import { z } from 'zod';

export const couponFormSchema = z.object({
  code: z.string().trim().min(1, 'O código é obrigatório').max(50, 'Máximo de 50 caracteres'),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: 'Informe um valor de desconto válido' }
  ),
  max_uses: z.string().optional().default(''),
  course_ids: z.array(z.string()).default([]),
  expires_at: z.string().optional().default(''),
  is_active: z.boolean().default(true),
  payment_methods: z.array(z.string()).default([]),
});

export type CouponFormData = z.infer<typeof couponFormSchema>;
