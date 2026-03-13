import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth } from "../auth";
import { ROLES } from "../../lib/types";
import { UserModel } from "../models";

const router = Router();

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(ROLES),
  department: z.string().optional(),
  active: z.coerce.boolean().optional().default(true)
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(ROLES).optional(),
  department: z.string().optional(),
  active: z.coerce.boolean().optional(),
  password: z.string().min(6).optional()
});

router.get("/users", requireAuth(["secretariat", "admin"]), async (request, response) => {
  const roleFilter = typeof request.query.role === "string" ? request.query.role : undefined;
  const query = roleFilter ? { role: roleFilter } : {};
  const users = await UserModel.find(query).sort({ createdAt: -1 });
  return response.json(
    users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      active: user.active
    }))
  );
});

router.post("/users", requireAuth(["admin"]), async (request, response) => {
  const parsed = createUserSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Complete all user fields correctly." });
  }

  const existingUser = await UserModel.findOne({ email: parsed.data.email.toLowerCase() });

  if (existingUser) {
    return response.status(409).json({ message: "A user with that email already exists." });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await UserModel.create({
    ...parsed.data,
    email: parsed.data.email.toLowerCase(),
    passwordHash
  });

  return response.status(201).json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    active: user.active
  });
});

router.patch("/users/:id", requireAuth(["admin"]), async (request, response) => {
  const parsed = updateUserSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid user update payload." });
  }

  const user = await UserModel.findById(request.params.id);

  if (!user) {
    return response.status(404).json({ message: "User not found." });
  }

  if (parsed.data.name !== undefined) {
    user.name = parsed.data.name;
  }

  if (parsed.data.role !== undefined) {
    user.role = parsed.data.role;
  }

  if (parsed.data.department !== undefined) {
    user.department = parsed.data.department;
  }

  if (parsed.data.active !== undefined) {
    user.active = parsed.data.active;
  }

  if (parsed.data.password) {
    user.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  await user.save();
  return response.json({ success: true });
});

export default router;