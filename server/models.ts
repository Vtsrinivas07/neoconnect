import mongoose, { Schema, type Model } from "mongoose";
import {
  CASE_CATEGORIES,
  CASE_SEVERITIES,
  CASE_STATUSES,
  ROLES,
  type UserRole
} from "../lib/types";

export interface UserDocument {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  department?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CaseNoteDocument {
  authorName: string;
  authorRole: UserRole | "system";
  message: string;
  createdAt: Date;
  system?: boolean;
}

export interface CaseDocument {
  trackingId: string;
  category: (typeof CASE_CATEGORIES)[number];
  department: string;
  location: string;
  severity: (typeof CASE_SEVERITIES)[number];
  description: string;
  anonymous: boolean;
  submitter?: mongoose.Types.ObjectId;
  submitterName: string;
  attachmentUrl?: string;
  assignedTo?: mongoose.Types.ObjectId;
  assignedToName?: string;
  status: (typeof CASE_STATUSES)[number];
  notes: CaseNoteDocument[];
  assignedAt?: Date;
  caseManagerRespondedAt?: Date;
  escalatedAt?: Date;
  reminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PollOptionDocument {
  label: string;
  votes: number;
}

export interface PollDocument {
  question: string;
  options: PollOptionDocument[];
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  voters: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DigestDocument {
  title: string;
  summary: string;
  quarter: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImpactDocument {
  raised: string;
  actionTaken: string;
  changeDelivered: string;
  department: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MinuteDocument {
  title: string;
  documentUrl: string;
  uploadedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CounterDocument {
  key: string;
  value: number;
}

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    department: { type: String, trim: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const CaseNoteSchema = new Schema<CaseNoteDocument>(
  {
    authorName: { type: String, required: true },
    authorRole: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    system: { type: Boolean, default: false }
  },
  { _id: true }
);

const CaseSchema = new Schema<CaseDocument>(
  {
    trackingId: { type: String, required: true, unique: true },
    category: { type: String, enum: CASE_CATEGORIES, required: true },
    department: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    severity: { type: String, enum: CASE_SEVERITIES, required: true },
    description: { type: String, required: true },
    anonymous: { type: Boolean, default: false },
    submitter: { type: Schema.Types.ObjectId, ref: "User" },
    submitterName: { type: String, required: true },
    attachmentUrl: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedToName: { type: String },
    status: { type: String, enum: CASE_STATUSES, default: "New" },
    notes: { type: [CaseNoteSchema], default: [] },
    assignedAt: { type: Date },
    caseManagerRespondedAt: { type: Date },
    escalatedAt: { type: Date },
    reminderSentAt: { type: Date }
  },
  { timestamps: true }
);

const PollOptionSchema = new Schema<PollOptionDocument>(
  {
    label: { type: String, required: true },
    votes: { type: Number, default: 0 }
  },
  { _id: false }
);

const PollSchema = new Schema<PollDocument>(
  {
    question: { type: String, required: true },
    options: { type: [PollOptionSchema], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdByName: { type: String, required: true },
    voters: { type: [Schema.Types.ObjectId], default: [] }
  },
  { timestamps: true }
);

const DigestSchema = new Schema<DigestDocument>(
  {
    title: { type: String, required: true },
    summary: { type: String, required: true },
    quarter: { type: String, required: true },
    publishedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const ImpactSchema = new Schema<ImpactDocument>(
  {
    raised: { type: String, required: true },
    actionTaken: { type: String, required: true },
    changeDelivered: { type: String, required: true },
    department: { type: String, required: true },
    publishedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const MinuteSchema = new Schema<MinuteDocument>(
  {
    title: { type: String, required: true },
    documentUrl: { type: String, required: true },
    uploadedByName: { type: String, required: true }
  },
  { timestamps: true }
);

const CounterSchema = new Schema<CounterDocument>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, default: 0 }
  },
  { versionKey: false }
);

export const UserModel = (mongoose.models.User as Model<UserDocument>) || mongoose.model<UserDocument>("User", UserSchema);
export const CaseModel = (mongoose.models.Case as Model<CaseDocument>) || mongoose.model<CaseDocument>("Case", CaseSchema);
export const PollModel = (mongoose.models.Poll as Model<PollDocument>) || mongoose.model<PollDocument>("Poll", PollSchema);
export const DigestModel = (mongoose.models.Digest as Model<DigestDocument>) || mongoose.model<DigestDocument>("Digest", DigestSchema);
export const ImpactModel = (mongoose.models.Impact as Model<ImpactDocument>) || mongoose.model<ImpactDocument>("Impact", ImpactSchema);
export const MinuteModel = (mongoose.models.Minute as Model<MinuteDocument>) || mongoose.model<MinuteDocument>("Minute", MinuteSchema);
export const CounterModel = (mongoose.models.Counter as Model<CounterDocument>) || mongoose.model<CounterDocument>("Counter", CounterSchema);