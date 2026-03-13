export const ROLES = ["staff", "secretariat", "case_manager", "admin"] as const;
export const CASE_CATEGORIES = ["Safety", "Policy", "Facilities", "HR", "Other"] as const;
export const CASE_SEVERITIES = ["Low", "Medium", "High"] as const;
export const CASE_STATUSES = [
  "New",
  "Assigned",
  "In Progress",
  "Pending",
  "Resolved",
  "Escalated"
] as const;

export type UserRole = (typeof ROLES)[number];
export type CaseCategory = (typeof CASE_CATEGORIES)[number];
export type CaseSeverity = (typeof CASE_SEVERITIES)[number];
export type CaseStatus = (typeof CASE_STATUSES)[number];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
}

export interface CaseNote {
  id?: string;
  authorName: string;
  authorRole: UserRole | "system";
  message: string;
  createdAt: string;
  system?: boolean;
}

export interface AppCase {
  id: string;
  trackingId: string;
  category: CaseCategory;
  department: string;
  location: string;
  severity: CaseSeverity;
  status: CaseStatus;
  description: string;
  anonymous: boolean;
  submitterName: string;
  assignedToId?: string;
  assignedToName?: string;
  attachmentUrl?: string;
  createdAt: string;
  assignedAt?: string;
  caseManagerRespondedAt?: string;
  escalatedAt?: string;
  notes: CaseNote[];
}

export interface PollOption {
  label: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdAt: string;
  createdByName: string;
  hasVoted: boolean;
  totalVotes: number;
}

export interface DigestEntry {
  id: string;
  title: string;
  summary: string;
  quarter: string;
  publishedAt: string;
}

export interface ImpactItem {
  id: string;
  raised: string;
  actionTaken: string;
  changeDelivered: string;
  department: string;
  publishedAt: string;
}

export interface MinuteItem {
  id: string;
  title: string;
  documentUrl: string;
  uploadedByName: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  departmentCounts: Array<{ department: string; count: number }>;
  statusCounts: Array<{ name: string; value: number }>;
  categoryCounts: Array<{ name: string; value: number }>;
  hotspots: Array<{ department: string; category: string; count: number }>;
}

export interface DashboardPayload {
  user: AuthUser;
  cases: AppCase[];
  polls: Poll[];
  digest: DigestEntry[];
  impact: ImpactItem[];
  minutes: MinuteItem[];
  analytics?: AnalyticsSummary;
  users?: Array<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    department?: string;
    active: boolean;
  }>;
}