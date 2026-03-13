import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | Date) {
  if (!value) {
    return "Not set";
  }

  return format(new Date(value), "dd MMM yyyy");
}

export function formatDateTime(value?: string | Date) {
  if (!value) {
    return "Not set";
  }

  return format(new Date(value), "dd MMM yyyy, HH:mm");
}

export function getStatusTone(status: string) {
  switch (status) {
    case "Resolved":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
    case "Escalated":
      return "bg-rose-500/15 text-rose-200 border-rose-500/30";
    case "Pending":
      return "bg-amber-500/15 text-amber-100 border-amber-500/30";
    case "In Progress":
      return "bg-sky-500/15 text-sky-100 border-sky-500/30";
    default:
      return "bg-slate-500/15 text-slate-100 border-slate-500/30";
  }
}

export function getRoleLabel(role: string) {
  switch (role) {
    case "secretariat":
      return "Secretariat";
    case "case_manager":
      return "Case Manager";
    case "admin":
      return "Admin";
    default:
      return "Staff";
  }
}