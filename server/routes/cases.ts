import { Router } from "express";
import multer from "multer";
import path from "path";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../auth";
import { CASE_CATEGORIES, CASE_SEVERITIES, CASE_STATUSES } from "../../lib/types";
import { CaseModel, CounterModel, UserModel } from "../models";

const router = Router();

const caseUpload = multer({
  storage: multer.diskStorage({
    destination: path.join(process.cwd(), "uploads", "cases"),
    filename: (_request, file, callback) => {
      const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
      callback(null, safeName);
    }
  })
});

const createCaseSchema = z.object({
  category: z.enum(CASE_CATEGORIES),
  department: z.string().min(2),
  location: z.string().min(2),
  severity: z.enum(CASE_SEVERITIES),
  description: z.string().min(10),
  anonymous: z.coerce.boolean().optional().default(false)
});

const assignmentSchema = z.object({
  assigneeId: z.string().min(1)
});

const statusUpdateSchema = z.object({
  status: z.enum(CASE_STATUSES),
  note: z.string().min(3).optional()
});

const noteSchema = z.object({
  message: z.string().min(3)
});

async function generateTrackingId() {
  const year = new Date().getFullYear();
  const counter = await CounterModel.findOneAndUpdate(
    { key: `case-${year}` },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );

  const nextValue = String(counter.value).padStart(3, "0");
  return `NEO-${year}-${nextValue}`;
}

function serializeCase(caseItem: any) {
  return {
    id: caseItem._id.toString(),
    trackingId: caseItem.trackingId,
    category: caseItem.category,
    department: caseItem.department,
    location: caseItem.location,
    severity: caseItem.severity,
    status: caseItem.status,
    description: caseItem.description,
    anonymous: caseItem.anonymous,
    submitterName: caseItem.anonymous ? "Anonymous" : caseItem.submitterName,
    assignedToId: caseItem.assignedTo?._id?.toString() || caseItem.assignedTo?.toString(),
    assignedToName: caseItem.assignedToName,
    attachmentUrl: caseItem.attachmentUrl,
    createdAt: caseItem.createdAt,
    assignedAt: caseItem.assignedAt,
    caseManagerRespondedAt: caseItem.caseManagerRespondedAt,
    escalatedAt: caseItem.escalatedAt,
    notes: (caseItem.notes || []).map((note: any) => ({
      id: note._id?.toString(),
      authorName: note.authorName,
      authorRole: note.authorRole,
      message: note.message,
      createdAt: note.createdAt,
      system: note.system
    }))
  };
}

router.get("/analytics/summary", requireAuth(["secretariat", "admin"]), async (_request, response) => {
  const [departmentCounts, statusCounts, categoryCounts, hotspots] = await Promise.all([
    CaseModel.aggregate([
      { $match: { status: { $ne: "Resolved" } } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $project: { _id: 0, department: "$_id", count: 1 } },
      { $sort: { count: -1 } }
    ]),
    CaseModel.aggregate([
      { $group: { _id: "$status", value: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", value: 1 } }
    ]),
    CaseModel.aggregate([
      { $group: { _id: "$category", value: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", value: 1 } }
    ]),
    CaseModel.aggregate([
      { $match: { status: { $ne: "Resolved" } } },
      { $group: { _id: { department: "$department", category: "$category" }, count: { $sum: 1 } } },
      { $match: { count: { $gte: 5 } } },
      {
        $project: {
          _id: 0,
          department: "$_id.department",
          category: "$_id.category",
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ])
  ]);

  return response.json({ departmentCounts, statusCounts, categoryCounts, hotspots });
});

router.get("/", requireAuth(), async (request: AuthenticatedRequest, response) => {
  const user = request.user!;
  const query: Record<string, unknown> = {};

  if (user.role === "staff") {
    query.submitter = user.id;
  }

  if (user.role === "case_manager") {
    query.assignedTo = user.id;
  }

  const cases = await CaseModel.find(query).sort({ createdAt: -1 });
  return response.json(cases.map(serializeCase));
});

router.post("/", requireAuth(["staff"]), caseUpload.single("attachment"), async (request: AuthenticatedRequest, response) => {
  const parsed = createCaseSchema.safeParse({
    ...request.body,
    anonymous: request.body.anonymous === "true" || request.body.anonymous === true
  });

  if (!parsed.success) {
    return response.status(400).json({ message: "Please complete all complaint fields correctly." });
  }

  const trackingId = await generateTrackingId();
  const attachmentUrl = request.file ? `/uploads/cases/${request.file.filename}` : undefined;
  const currentUser = request.user!;

  const createdCase = await CaseModel.create({
    trackingId,
    ...parsed.data,
    submitter: currentUser.id,
    submitterName: currentUser.name,
    attachmentUrl,
    notes: [
      {
        authorName: parsed.data.anonymous ? "Anonymous Staff" : currentUser.name,
        authorRole: currentUser.role,
        message: "Case submitted and awaiting review.",
        createdAt: new Date()
      }
    ]
  });

  return response.status(201).json(serializeCase(createdCase));
});

router.patch("/:id/assign", requireAuth(["secretariat", "admin"]), async (request: AuthenticatedRequest, response) => {
  const parsed = assignmentSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Select a valid case manager." });
  }

  const assignee = await UserModel.findOne({ _id: parsed.data.assigneeId, role: "case_manager", active: true });

  if (!assignee) {
    return response.status(404).json({ message: "Case manager not found." });
  }

  const caseItem = await CaseModel.findById(request.params.id);

  if (!caseItem) {
    return response.status(404).json({ message: "Case not found." });
  }

  caseItem.assignedTo = assignee._id;
  caseItem.assignedToName = assignee.name;
  caseItem.assignedAt = new Date();
  caseItem.status = "Assigned";
  caseItem.notes.push({
    authorName: request.user?.name || "System",
    authorRole: request.user?.role || "system",
    message: `Case assigned to ${assignee.name}.`,
    createdAt: new Date()
  });
  await caseItem.save();

  return response.json(serializeCase(caseItem));
});

router.patch("/:id/status", requireAuth(["secretariat", "case_manager", "admin"]), async (request: AuthenticatedRequest, response) => {
  const parsed = statusUpdateSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Choose a valid status update." });
  }

  const caseItem = await CaseModel.findById(request.params.id);

  if (!caseItem) {
    return response.status(404).json({ message: "Case not found." });
  }

  const user = request.user!;

  if (user.role === "case_manager" && caseItem.assignedTo?.toString() !== user.id) {
    return response.status(403).json({ message: "You can only update cases assigned to you." });
  }

  caseItem.status = parsed.data.status;

  if (!caseItem.caseManagerRespondedAt && ["case_manager", "secretariat", "admin"].includes(user.role)) {
    caseItem.caseManagerRespondedAt = new Date();
  }

  if (parsed.data.note) {
    caseItem.notes.push({
      authorName: user.name,
      authorRole: user.role,
      message: parsed.data.note,
      createdAt: new Date()
    });
  }

  await caseItem.save();
  return response.json(serializeCase(caseItem));
});

router.post("/:id/notes", requireAuth(["secretariat", "case_manager", "admin"]), async (request: AuthenticatedRequest, response) => {
  const parsed = noteSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Enter a note with enough detail." });
  }

  const caseItem = await CaseModel.findById(request.params.id);

  if (!caseItem) {
    return response.status(404).json({ message: "Case not found." });
  }

  const user = request.user!;

  if (user.role === "case_manager" && caseItem.assignedTo?.toString() !== user.id) {
    return response.status(403).json({ message: "You can only add notes to cases assigned to you." });
  }

  if (!caseItem.caseManagerRespondedAt && user.role === "case_manager") {
    caseItem.caseManagerRespondedAt = new Date();
  }

  caseItem.notes.push({
    authorName: user.name,
    authorRole: user.role,
    message: parsed.data.message,
    createdAt: new Date()
  });
  await caseItem.save();

  return response.json(serializeCase(caseItem));
});

export default router;