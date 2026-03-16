import { z } from 'zod';

export const courseBasicInfoSchema = z.object({
  title: z.string().trim().min(1, 'O nome do curso é obrigatório').max(200, 'Máximo de 200 caracteres'),
  description: z.string().max(2000, 'Máximo de 2000 caracteres').optional().default(''),
  thumbnail_url: z.string().optional().default(''),
  category_id: z.string().optional().default(''),
  launch_date: z.string().optional().default(''),
  is_sequential: z.boolean().default(true),
});

export const coursePricingSchema = z.discriminatedUnion('pricing_type', [
  z.object({
    pricing_type: z.literal('free'),
    price: z.string().optional().default(''),
    payment_methods: z.array(z.string()).optional().default([]),
    installments: z.string().optional().default('1'),
  }),
  z.object({
    pricing_type: z.literal('paid'),
    price: z.string().refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: 'Informe um valor válido para o curso' }
    ),
    payment_methods: z.array(z.string()).min(1, 'Selecione pelo menos um método de pagamento'),
    installments: z.string().default('1'),
  }),
]);

export const courseFormSchema = z.object({
  title: z.string().trim().min(1, 'O nome do curso é obrigatório').max(200, 'Máximo de 200 caracteres'),
  description: z.string().max(2000).optional().default(''),
  thumbnail_url: z.string().optional().default(''),
  pandavideo_folder_id: z.string().optional().default(''),
  pandavideo_folder_name: z.string().optional().default(''),
  is_sequential: z.boolean().default(true),
  save_as_draft: z.boolean().default(false),
  pricing_type: z.enum(['free', 'paid']).default('free'),
  price: z.string().optional().default(''),
  payment_methods: z.array(z.string()).default([]),
  installments: z.string().default('1'),
  category_id: z.string().optional().default(''),
  launch_date: z.string().optional().default(''),
  points_reward: z.string().optional().default('0'),
});

export type CourseFormData = z.infer<typeof courseFormSchema>;

export const initialCourseFormData: CourseFormData = {
  title: '',
  description: '',
  thumbnail_url: '',
  pandavideo_folder_id: '',
  pandavideo_folder_name: '',
  is_sequential: true,
  save_as_draft: false,
  pricing_type: 'free',
  price: '',
  payment_methods: [],
  installments: '1',
  category_id: '',
  launch_date: '',
  points_reward: '0',
};

export function validateCourseStep(step: number, data: CourseFormData): string | null {
  if (step === 1) {
    const result = courseBasicInfoSchema.safeParse(data);
    if (!result.success) return result.error.errors[0]?.message ?? 'Erro de validação';
  }
  if (step === 3 && data.pricing_type === 'paid') {
    const result = coursePricingSchema.safeParse(data);
    if (!result.success) return result.error.errors[0]?.message ?? 'Erro de validação';
  }
  return null;
}
