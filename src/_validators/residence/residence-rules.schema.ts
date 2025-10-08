import { z } from 'zod';

export const updateResidenceRulesSchema = z.object({
  ruleIds: z.array(z.number().int()).min(1),
});

export const updateResidenceSpecialConditionsSchema = z.object({
  specialConditionIds: z.array(z.number().int()).min(1),
});
