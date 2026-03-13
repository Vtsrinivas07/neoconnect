import { addDays, isWeekend, startOfDay } from "date-fns";
import { CaseModel } from "./models";

const ESCALATION_ELIGIBLE_STATUSES = ["Assigned", "In Progress", "Pending"];

function addWorkingDays(date: Date, days: number) {
  let current = startOfDay(date);
  let remaining = days;

  while (remaining > 0) {
    current = addDays(current, 1);

    if (!isWeekend(current)) {
      remaining -= 1;
    }
  }

  return current;
}

export async function runEscalationSweep() {
  const candidates = await CaseModel.find({
    assignedAt: { $exists: true },
    status: { $in: ESCALATION_ELIGIBLE_STATUSES },
    caseManagerRespondedAt: { $exists: false }
  });

  let escalatedCount = 0;
  const now = new Date();

  for (const caseItem of candidates) {
    if (!caseItem.assignedAt) {
      continue;
    }

    const dueDate = addWorkingDays(caseItem.assignedAt, 7);

    if (dueDate <= now) {
      caseItem.status = "Escalated";
      caseItem.escalatedAt = now;
      caseItem.reminderSentAt = now;
      caseItem.notes.push({
        authorName: "System",
        authorRole: "system",
        message: "No response within 7 working days. Reminder sent and case escalated to management.",
        createdAt: now,
        system: true
      });
      await caseItem.save();
      escalatedCount += 1;
    }
  }

  return escalatedCount;
}