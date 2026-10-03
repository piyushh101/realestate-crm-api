import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../lib/env.js";

const payloadSchema = z.object({
  id: z.number(),
  role: z.enum(["admin", "agent"]),
});

export function auth(req: Request, res: Response, next: NextFunction) {
  // 1. header lo: req.headers.authorization
  const header = req.headers.authorization;

  if(!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Unauthorized" });
  return;
  }
  //    nahi hai YA "Bearer " se start nahi hota → 401

  // 2. token nikalo: header ke "Bearer " ke baad wala hissa
  //    hint: split(" ")[1]
   const token = header.split(" ")[1];
   if (!token) {
  res.status(401).json({ success: false, message: "Unauthorized" });
  return;
}

  try {
       const decoded = jwt.verify(token, env.JWT_SECRET);
       const parsed = payloadSchema.safeParse(decoded);
       if (!parsed.success) {
  res.status(401).json({ success: false, message: "Invalid or expired token" });
  return;
}
       req.user = parsed.data;   
       next(); return;
     } catch {
       res.status(401).json({ success: false, message: "Invalid or expired token" });
     }
}