import { Router, type Request, type Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { createLeadSchema,assignLeadSchema ,updateLeadStatusSchema} from "../schemas/lead.schema.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import type { LeadStatus } from "@prisma/client";

const allowedTransitions: Record<LeadStatus, LeadStatus[]> = {
  new: ["contacted", "lost"],
  contacted: ["site_visit", "lost"],
  site_visit: ["closed", "lost"],
  closed: [],
  lost: [],
};

export const leadRouter = Router();

leadRouter.post("/", async (req: Request, res: Response) => {
  // 1. createLeadSchema safeParse → 400
   const parsed = createLeadSchema.safeParse(req.body);
   if (!parsed.success) {
   res.status(400).json({ success: false, errors: parsed.error.issues });
   return;
 } 
  // 2. property dhoondo (findUnique, id = parsed.data.propertyId)
  //    nahi mili → 404 "Property not found"
  const property = await prisma.property.findUnique({
  where: { id: parsed.data.propertyId},
});
if (!property) {
  res.status(404).json({ success: false, message: "Property not Found" });
  return;
}

  // 3. property.status "sold" hai → 400 "Property is no longer available"
if (property.status === "sold") {
  res.status(400).json({ success: false, message: "Property is no longer available" });
  return;
}
const lead  = await prisma.lead.create({ data: parsed.data })
res.status(201).json({ success: true, data: lead  });

  // 5. 201 + { success: true, data: lead }
});

leadRouter.get("/", auth, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "User not found" });
    return;
  }

  const where: Prisma.LeadWhereInput = {};

  if (req.user.role === "agent") {
    where.assignedToId = req.user.id;   // agent ki apni id
  }
  // admin ke liye kuch nahi — khaali where = sab

  const leads = await prisma.lead.findMany({
    where,
    include: { property: { select: { id: true, title: true, city: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: leads });
});

leadRouter.patch("/:id/assign", auth, requireRole("admin"), async (req: Request<{ id: string }>, res: Response) => {
  // 1. lead id validate (Number.isInteger) → 400
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
  res.status(400).json({ success: false, message: "Invalid lead id" });
  return;
}

  // 2. body: assignLeadSchema.safeParse(req.body) → 400
   const body = assignLeadSchema.safeParse(req.body);
   if (!body.success) {
   res.status(400).json({ success: false, errors: body.error.issues });
   return;
 } 

  // 3. lead exist karti hai?
  //    prisma.lead.findUnique({ where: { id } }) → nahi → 404 "Lead not found"
  const existing = await prisma.lead.findUnique({ where: { id } });

  if (!existing) {
    res.status(404).json({ success: false, message: "Lead not found" });
    return;
  }
  // 4. agent check:
  const agent = await prisma.user.findUnique({ where: { id: body.data.agentId } });
  //    agent nahi mila YA agent.role !== "agent" → 400 "Invalid agent"
    if(!agent || agent.role !== "agent"){
      res.status(400).json({ success: false, message: "Invalid Agent" });
      return;
    }
  // 5. assign:
  const updated = await prisma.lead.update({
    where: { id },
    data: { assignedToId: body.data.agentId  },
    include: { assignedTo: { select: { id: true, name: true } } },
  });
res.json({ success: true, data: updated });
  // 6. 200 + { success: true, data: updated }
});

leadRouter.patch("/:id/status", auth, async (req: Request<{ id: string }>, res: Response) => {
  // 1. req.user guard → 401
   if (!req.user) {
    res.status(401).json({ success: false, message: "User not found" });
    return;
  }
  // 2. id validate → 400
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
  res.status(400).json({ success: false, message: "Invalid lead id" });
  return;
}
  // 3. updateLeadStatusSchema safeParse → 400
   const body = updateLeadStatusSchema.safeParse(req.body);
   if (!body.success) {
   res.status(400).json({ success: false, errors: body.error.issues });
   return;
 } 
  // 4. lead findUnique → nahi → 404
    const lead = await prisma.lead.findUnique({ where: { id } });

  if (!lead) {
    res.status(404).json({ success: false, message: "Lead not found" });
    return;
  }

  // 5. OWNERSHIP: agent hai AUR lead uski nahi → 404 "Lead not found"
  if (req.user.role === "agent" && lead.assignedToId !== req.user.id) { 
    res.status(404).json({ success: false, message: "Lead not found" });
    return;
   }
const newStatus = body.data.status;
const allowed = allowedTransitions[lead.status];

  if (!allowed.includes(newStatus)) {
  res.status(400).json({
    success: false,
    message: `Cannot change status from ${lead.status} to ${newStatus}`,
  });
  return;
}
const updated = await prisma.lead.update({
  where: { id },
  data: { status: newStatus },
});

res.json({ success: true, data: updated });
})