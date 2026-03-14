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

const router = Router();

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