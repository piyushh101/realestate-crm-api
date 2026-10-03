import { z } from "zod";

export const createLeadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),
  message: z.string().max(500).optional(),
  propertyId: z.number().int().positive(),
});

export const assignLeadSchema = z.object({
  agentId: z.number().int().positive(),
});

export const updateLeadStatusSchema = z.object({
  status: z.enum(["new", "contacted", "site_visit", "closed", "lost"]),
});

export type UpdateLeadStatusBody = z.infer<typeof updateLeadStatusSchema>;
export type AssignLeadBody = z.infer<typeof assignLeadSchema>;
export type CreateLeadBody = z.infer<typeof createLeadSchema>;