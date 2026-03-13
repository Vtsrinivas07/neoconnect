import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "./db";
import { CaseModel, CounterModel, DigestModel, ImpactModel, MinuteModel, PollModel, UserModel } from "./models";

async function seed() {
  await connectToDatabase();

  await Promise.all([
    CaseModel.deleteMany({}),
    PollModel.deleteMany({}),
    DigestModel.deleteMany({}),
    ImpactModel.deleteMany({}),
    MinuteModel.deleteMany({}),
    CounterModel.deleteMany({}),
    UserModel.deleteMany({})
  ]);

  const defaultPassword = await bcrypt.hash("Password123!", 10);
  const [staff, secretariat, caseManager, admin] = await UserModel.create([
    {
      name: "Alice Staff",
      email: "staff@neoconnect.local",
      passwordHash: defaultPassword,
      role: "staff",
      department: "Operations"
    },
    {
      name: "Maya Secretariat",
      email: "secretariat@neoconnect.local",
      passwordHash: defaultPassword,
      role: "secretariat",
      department: "Management"
    },
    {
      name: "Noah Manager",
      email: "manager@neoconnect.local",
      passwordHash: defaultPassword,
      role: "case_manager",
      department: "HR"
    },
    {
      name: "Iris Admin",
      email: "admin@neoconnect.local",
      passwordHash: defaultPassword,
      role: "admin",
      department: "IT"
    }
  ]);

  const createdCase = await CaseModel.create({
    trackingId: "NEO-2026-001",
    category: "Facilities",
    department: "Operations",
    location: "Plant A",
    severity: "High",
    description: "Air circulation in the packing zone has been failing during peak shifts.",
    anonymous: false,
    submitter: staff._id,
    submitterName: staff.name,
    assignedTo: caseManager._id,
    assignedToName: caseManager.name,
    status: "In Progress",
    assignedAt: new Date("2026-03-03T09:00:00.000Z"),
    caseManagerRespondedAt: new Date("2026-03-04T11:30:00.000Z"),
    notes: [
      {
        authorName: staff.name,
        authorRole: staff.role,
        message: "Submitted with site photos from the afternoon shift.",
        createdAt: new Date("2026-03-03T08:15:00.000Z")
      },
      {
        authorName: caseManager.name,
        authorRole: caseManager.role,
        message: "Facilities vendor scheduled for inspection tomorrow morning.",
        createdAt: new Date("2026-03-04T11:30:00.000Z")
      }
    ]
  });

  await CounterModel.create({ key: "case-2026", value: 1 });

  await PollModel.create({
    question: "Which topic should be discussed first in the next staff forum?",
    options: [
      { label: "Safety training refresh", votes: 4 },
      { label: "Shift scheduling", votes: 7 },
      { label: "Facilities upgrades", votes: 3 }
    ],
    createdBy: secretariat._id,
    createdByName: secretariat.name,
    voters: [staff._id]
  });

  await DigestModel.create({
    title: "Quarterly Digest: Faster escalations and site fixes",
    summary: "Four facilities issues were resolved within the quarter after a new assignment queue and weekly case reviews were introduced.",
    quarter: "Q1 2026"
  });

  await ImpactModel.create({
    raised: "Repeated ventilation complaints from Operations",
    actionTaken: "Maintenance contract updated and inspection cadence doubled",
    changeDelivered: "Lower incident reports and improved staff comfort during peak shifts",
    department: "Operations"
  });

  console.log("Seed complete. Demo case:", createdCase.trackingId);
  console.log("Demo logins: staff@neoconnect.local, secretariat@neoconnect.local, manager@neoconnect.local, admin@neoconnect.local");
  console.log("Password for all demo users: Password123!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});