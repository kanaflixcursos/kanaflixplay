import { z } from 'zod';

export const leadFormFieldSchema = z.object({
  name: z.string().trim().min(1),
  label: z.string().trim().min(1),
  type: z.enum(['text', 'email', 'phone', 'select']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export const leadFormSchema = z.object({
  name: z.string().trim().min(1, 'O nome do formulário é obrigatório').max(100),
  description: z.string().max(500).nullable().optional(),
  slug: z.string().trim().min(1, 'O slug é obrigatório').max(100)
    .regex(/^[a-z0-9-]+$/, 'O slug deve conter apenas letras minúsculas, números e hífens'),
  fields: z.array(leadFormFieldSchema).min(1, 'Adicione pelo menos um campo'),
  redirect_url: z.string().url('URL inválida').nullable().optional().or(z.literal('')),
  is_active: z.boolean().default(true),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;
export type LeadFormField = z.infer<typeof leadFormFieldSchema>;
