import { z } from 'zod';
import { AutomationEntityType, AutomationTriggerType } from '../types';

export const automationConditionSchema = z.object({
  field: z.string().min(1, 'Campo é obrigatório'),
  operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty']),
  value: z.any().optional(),
});

export const automationActionSchema = z.object({
  type: z.enum(['update_field', 'create_task', 'send_notification', 'send_webhook', 'change_stage', 'assign_user']),
  config: z.record(z.string(), z.any()),
});

export const automationSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  workspace_id: z.string().uuid('Workspace ID inválido'),
  entity_type: z.nativeEnum(AutomationEntityType),
  trigger_type: z.nativeEnum(AutomationTriggerType),
  trigger_conditions: z.array(automationConditionSchema).default([]),
  actions: z.array(automationActionSchema).min(1, 'Pelo menos uma ação é necessária'),
  is_active: z.boolean().default(true),
});

export type AutomationInput = z.infer<typeof automationSchema>;
