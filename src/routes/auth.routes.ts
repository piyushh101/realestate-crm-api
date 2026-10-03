import { Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";


export const authRouter = Router();

authRouter.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body); 

 if (!parsed.success) {
  res.status(400).json({ success: false, errors: parsed.error.issues });
  return;
}

const existing = await prisma.user.findUnique({
where: { email: parsed.data.email },
})
if (existing) {
res.status(409).json({ success: false, message: "Email already registered" });
return;
}// 3. password hash
const hashed = await bcrypt.hash(parsed.data.password, 10);

// 4. user banao
const user = await prisma.user.create({
  data: {
    name: parsed.data.name,
    email: parsed.data.email,
    password: hashed ,
  },
  select: { id: true, name: true, email: true, role: true },
});

// 5. response
res.status(201).json({ success: true, data: user });

  // 2. email pehle se exist karta hai?
  //    prisma.user.findUnique({ where: { email: ... } })
  //    mila → 409 "Email already registered"

  // 3. password hash: await bcrypt.hash(password, 10)

  // 4. prisma.user.create({
  //      data: { name, email, password: hashed },
  //      select: { id: true, name: true, email: true, role: true },
  //    })

  // 5. 201 + { success: true, data: user }
});


authRouter.post("/login", async (req: Request, res: Response) => {


const parsed = loginSchema.safeParse(req.body); 
if (!parsed.success) {
  res.status(400).json({ success: false, errors: parsed.error.issues });
  return;
}
const user = await prisma.user.findUnique({
  where: { email: parsed.data.email},
});
if (!user) {
  res.status(401).json({ success: false, message: "Invalid email or password" });
  return;
}
const ok = await bcrypt.compare(parsed.data.password, user.password);
if (!ok) {
   res.status(401).json({ success: false, message: "Invalid email or password" });
  return;
}
const token = jwt.sign(
  { id: user.id, role: user.role },
  env.JWT_SECRET,
  { expiresIn: "7d" },
);

res.json({ success: true, data: { token } });

  // 2. user dhoondo: prisma.user.findUnique({ where: { email } })
  //    nahi mila → 401 "Invalid email or password"

  // 3. const ok = await bcrypt.compare(plainPassword, user.password)
  //    false → 401 "Invalid email or password"

  // 4. token = jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn: "7d" })

  // 5. 200 + { success: true, data: { token } }
});


