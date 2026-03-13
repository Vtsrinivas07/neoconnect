# NeoConnect

NeoConnect is a full-stack staff feedback and complaint management platform built for the supplied hackathon use case. It includes role-based JWT authentication, complaint intake with tracking IDs, case assignment and escalation, staff polls, a public accountability hub, analytics, and user management.

## Stack

- Next.js 15 + React 19
- Express.js custom server
- MongoDB + Mongoose
- Tailwind CSS
- shadcn-style local UI components
- JWT auth with httpOnly cookie persistence

## Features

- Staff complaint form with category, department, location, severity, anonymous toggle, and photo/PDF upload
- Unique tracking IDs in the format `NEO-YYYY-001`
- Secretariat inbox and case assignment to case managers
- Case manager status updates, notes, and resolution workflow
- Automatic escalation when no case-manager response exists after 7 working days
- Public hub with quarterly digest, impact tracking, and searchable minutes archive
- Poll creation for secretariat and one-vote poll participation for staff
- Analytics dashboard with department heat, status/category counts, and hotspot flagging
- Admin user creation and account directory

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and update the secret if needed:

   ```bash
   copy .env.example .env
   ```

3. Start MongoDB locally and make sure `MONGODB_URI` points to it.

4. Seed demo data:

   ```bash
   npm run seed
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

## Demo accounts

- Staff: `staff@neoconnect.local`
- Secretariat: `secretariat@neoconnect.local`
- Case Manager: `manager@neoconnect.local`
- Admin: `admin@neoconnect.local`
- Password for all seeded users: `Password123!`

## File uploads

- Complaint attachments are stored in `uploads/cases`
- Meeting minutes PDFs are stored in `uploads/minutes`

## Notes

- The app uses an Express custom server so API routes and the Next.js frontend run together on the same port.
- Escalation sweeps run at startup, through the health endpoint, and hourly while the server is running.