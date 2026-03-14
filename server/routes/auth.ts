import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { clearAuthCookie, requireAuth, setAuthCookie, type AuthenticatedRequest, signToken } from "../auth";
import { UserModel } from "../models";
import { ROLES, type AuthUser } from "../../lib/types";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(ROLES)
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  department: z.string().trim().optional()
});

const router = Router();

router.post("/register", async (request, response) => {
  const parsed = registerSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Complete all required fields correctly." });
  }

  const existingUser = await UserModel.findOne({ email: parsed.data.email.toLowerCase() });

  if (existingUser) {
    return response.status(409).json({ message: "An account already exists for that email." });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await UserModel.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    passwordHash,
    role: "staff",
    department: parsed.data.department || undefined,
    active: true
  });

  const authUser: AuthUser = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department
  };

  setAuthCookie(response, signToken(authUser));
  return response.status(201).json({ user: authUser });
});

router.post("/login", async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Enter valid email, password, and role." });
  }

  const user = await UserModel.findOne({ email: parsed.data.email.toLowerCase(), role: parsed.data.role, active: true });

  if (!user) {
    return response.status(401).json({ message: "Invalid credentials." });
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    return response.status(401).json({ message: "Invalid credentials." });
  }

  const authUser: AuthUser = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department
  };

  setAuthCookie(response, signToken(authUser));
  return response.json({ user: authUser });
});

router.get("/me", requireAuth(), async (request: AuthenticatedRequest, response) => {
  return response.json({ user: request.user });
});

router.post("/logout", (_request, response) => {
  clearAuthCookie(response);
  return response.json({ success: true });
});

export default router;