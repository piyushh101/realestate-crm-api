import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if(!user){
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
    }

    // 2. roles mein req.user.role nahi hai → 403 "Forbidden"
    //    hint: array ka includes method
    if (!roles.includes(user.role)) {
  res.status(403).json({ success: false, message: "Forbidden" });
  return;
}

next();

    // 3. next()
  };
}