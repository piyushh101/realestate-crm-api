import { z } from "zod";

export const createPropertySchema = z.object({
  title: z.string().min(3),
  city: z.string().min(2),
  price:z.number().int().positive(),
  type: z.enum(["apartment", "villa", "plot"]),
  status: z.enum(["available", "sold"]).optional(),
});
export const listPropertiesQuerySchema = z.object({
  city: z.string().min(2).optional(),
  type: z.enum(["apartment", "villa", "plot"]).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10), 
  status: z.enum(["available", "sold"]).optional(),
});


export const updatePropertySchema = createPropertySchema.partial();

export type CreatePropertyBody = z.infer<typeof createPropertySchema>;
export type UpdatePropertyBody = z.infer<typeof updatePropertySchema>;
export type ListPropertiesQuery = z.infer<typeof listPropertiesQuerySchema>;

