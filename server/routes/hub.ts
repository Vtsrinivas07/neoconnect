import { Router } from "express";
import multer from "multer";
import path from "path";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../auth";
import { DigestModel, ImpactModel, MinuteModel } from "../models";

const router = Router();

const minuteUpload = multer({
  storage: multer.diskStorage({
    destination: path.join(process.cwd(), "uploads", "minutes"),
    filename: (_request, file, callback) => {
      const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
      callback(null, safeName);
    }
  }),
  fileFilter: (_request, file, callback) => {
    callback(null, file.mimetype === "application/pdf");
  }
});

const digestSchema = z.object({
  title: z.string().min(3),
  summary: z.string().min(10),
  quarter: z.string().min(2)
});

const impactSchema = z.object({
  raised: z.string().min(3),
  actionTaken: z.string().min(3),
  changeDelivered: z.string().min(3),
  department: z.string().min(2)
});

const minuteSchema = z.object({
  title: z.string().min(3)
});

router.get("/digest", requireAuth(), async (_request, response) => {
  const digest = await DigestModel.find().sort({ publishedAt: -1 });
  return response.json(
    digest.map((entry) => ({
      id: entry._id.toString(),
      title: entry.title,
      summary: entry.summary,
      quarter: entry.quarter,
      publishedAt: entry.publishedAt
    }))
  );
});

router.post("/digest", requireAuth(["secretariat", "admin"]), async (request, response) => {
  const parsed = digestSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Complete all digest fields." });
  }

  const digest = await DigestModel.create(parsed.data);
  return response.status(201).json(digest);
});

router.get("/impact", requireAuth(), async (_request, response) => {
  const items = await ImpactModel.find().sort({ publishedAt: -1 });
  return response.json(
    items.map((item) => ({
      id: item._id.toString(),
      raised: item.raised,
      actionTaken: item.actionTaken,
      changeDelivered: item.changeDelivered,
      department: item.department,
      publishedAt: item.publishedAt
    }))
  );
});

router.post("/impact", requireAuth(["secretariat", "admin"]), async (request, response) => {
  const parsed = impactSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Complete all impact tracker fields." });
  }

  const item = await ImpactModel.create(parsed.data);
  return response.status(201).json(item);
});

router.get("/minutes", requireAuth(), async (request, response) => {
  const searchTerm = String(request.query.q || "").trim().toLowerCase();
  const query = searchTerm ? { title: { $regex: searchTerm, $options: "i" } } : {};
  const minutes = await MinuteModel.find(query).sort({ createdAt: -1 });

  return response.json(
    minutes.map((item) => ({
      id: item._id.toString(),
      title: item.title,
      documentUrl: item.documentUrl,
      uploadedByName: item.uploadedByName,
      createdAt: item.createdAt
    }))
  );
});

router.post("/minutes", requireAuth(["secretariat", "admin"]), minuteUpload.single("document"), async (request: AuthenticatedRequest, response) => {
  const parsed = minuteSchema.safeParse(request.body);

  if (!parsed.success || !request.file) {
    return response.status(400).json({ message: "Upload a PDF and provide a title." });
  }

  const minute = await MinuteModel.create({
    title: parsed.data.title,
    documentUrl: `/uploads/minutes/${request.file.filename}`,
    uploadedByName: request.user!.name
  });

  return response.status(201).json(minute);
});

export default router;