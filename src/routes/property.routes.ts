import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { createPropertySchema,listPropertiesQuerySchema,updatePropertySchema  } from "../schemas/property.schema.js";

export const propertyRouter = Router();

propertyRouter.post("/", auth, requireRole("admin"), async (req: Request, res: Response) => {

  const parsed = createPropertySchema.safeParse(req.body);
  if (!parsed.success) {
  res.status(400).json({ success: false, errors: parsed.error.issues });
  return;
} 
const property  = await prisma.property.create({
  data: parsed.data,
});
  // 2. prisma.property.create({ data: parsed.data })
res.status(201).json({ success: true, data: property });
  // 3. 201 + { success: true, data: property }
});

propertyRouter.get("/", auth, async (req: Request, res: Response) => {
  // 1. listPropertiesQuerySchema se req.query safeParse → 400
  const parsed = listPropertiesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
  res.status(400).json({ success: false, errors: parsed.error.issues });
  return;
  }

  const { city, type, status, minPrice, maxPrice, page, limit } = parsed.data;

  // 2. dynamic where
  const where: Prisma.PropertyWhereInput = {};

  if (city) where.city = { equals: city, mode: "insensitive" };
  if (type) where.type = type;
  if (status) where.status = status;
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = { gte: minPrice, lte: maxPrice };
  }
  const skip = (page - 1) * limit;
  const [properties, total] = await Promise.all([
    prisma.property.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.property.count({ where }),
  ]);
 res.json({
    success: true,
    data: properties,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });

  // 3. Promise.all: findMany (where, skip, take, orderBy createdAt desc) + count({ where })

  // 4. response: data + meta (page, limit, total, totalPages)
});

propertyRouter.patch("/:id", auth, requireRole("admin"), async (req: Request<{ id: string }>, res: Response) => {
  // 1. id validate
  
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ success: false, message: "Invalid Property id" });
    return;
  }

  // 2. body validate
  const parsed = updatePropertySchema.safeParse(req.body);
   if (!parsed.success) {
    res.status(400).json({ success: false, errors: parsed.error.issues });
    return;
  }

  // 3. exist check
 const existing = await prisma.property.findUnique({ where: { id } });

  if (!existing) {
    res.status(404).json({ success: false, message: "Property not found" });
    return;
  }

  // 4. update
  const updated = await prisma.property.update({
    where: { id },
    data: parsed.data,
  });
res.json({ success: true, data: updated });
  // 5. response 200
});

propertyRouter.delete("/:id", auth,requireRole("admin"),async (req: Request<{ id: string }>, res: Response) => {

  // 2. URL param validate
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ success: false, message: "Invalid Property id" });
    return;
  }
const leadCount = await prisma.lead.count({ where: { propertyId: id  } });

if (leadCount > 0) {
  res.status(409).json({
    success: false,
    message: "Property has leads and cannot be deleted. Mark it as sold instead.",
  });
  return;
}
 
  const existing = await prisma.property.findUnique({ where: { id } });

  if (!existing) {
    res.status(404).json({ success: false, message: "Property not found" });
    return;
  }

   await prisma.property.delete({
    where: { id },
  });

  res.json({ success: true, message:"Property deleted"});
});