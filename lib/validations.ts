
import { z } from 'zod';

export const leadSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  company_name: z.string().optional(),
  contact_name: z.string().optional(),
  value: z.number().nonnegative('O valor não pode ser negativo').default(0),
  status: z.enum(['active', 'won', 'lost']).default('active'),
  pipeline_id: z.string().uuid('Pipeline inválido'),
  stage_id: z.string().uuid('Etapa inválida'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  service_type: z.string().optional(),
  temperature: z.string().optional(),
  probability: z.number().min(0).max(100).default(0),
  source: z.string().optional(),
  campaign: z.string().optional(),
  responsible_id: z.string().uuid().optional().nullable(),
});

export const companySchema = z.object({
  name: z.string().min(2, 'O nome da empresa deve ter pelo menos 2 caracteres'),
  cnpj: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  niche: z.string().optional(),
  notes: z.string().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  role: z.string().optional(),
  company_id: z.string().uuid('Empresa inválida').optional().nullable(),
  linkedin: z.string().url('URL inválida').optional().or(z.literal('')),
  notes: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type ContactInput = z.infer<typeof contactSchema>;
