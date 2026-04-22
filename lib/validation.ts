import { z } from 'zod';

export const leadSchema = z.object({
  company_name: z.string().min(1, "Nome da empresa é obrigatório"),
  company_cnpj: z.string().optional(),
  company_city: z.string().optional(),
  company_state: z.string().optional(),
  company_niche: z.string().optional(),
  company_website: z.string().url("URL do site inválida").optional().or(z.literal('')),
  company_email: z.string().email("E-mail da empresa inválido").optional().or(z.literal('')),
  company_whatsapp: z.string().optional(),
  contact_name: z.string().min(1, "Nome do contato é obrigatório"),
  contact_role: z.string().optional(),
  contact_email: z.string().email("E-mail do contato inválido").optional().or(z.literal('')),
  contact_whatsapp: z.string().optional(),
  contact_notes: z.string().optional(),
  pipeline_id: z.string().min(1, "Pipeline é obrigatório"),
  stage: z.string().min(1, "Estágio é obrigatório"),
  value: z.number().optional(),
  business_notes: z.string().optional(),
  service_type: z.string().optional(),
  responsible_id: z.string().optional(),
  status: z.string().optional(),
});

export type LeadFormData = z.infer<typeof leadSchema>;
