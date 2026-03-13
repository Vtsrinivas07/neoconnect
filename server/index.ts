import "dotenv/config";
import fs from "fs";
import path from "path";
import express from "express";
import cookieParser from "cookie-parser";
import next from "next";
import { connectToDatabase } from "./db";
import { runEscalationSweep } from "./scheduler";
import authRoutes from "./routes/auth";
import caseRoutes from "./routes/cases";
import pollRoutes from "./routes/polls";
import hubRoutes from "./routes/hub";
import adminRoutes from "./routes/admin";

const port = Number(process.env.PORT || 3000);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, dir: process.cwd() });
const handle = app.getRequestHandler();

async function startServer() {
  fs.mkdirSync(path.join(process.cwd(), "uploads", "cases"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), "uploads", "minutes"), { recursive: true });

  await connectToDatabase();
  await app.prepare();

  const server = express();

  server.use(cookieParser());
  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));
  server.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  server.get("/api/health", async (_request, response) => {
    const escalatedCount = await runEscalationSweep();
    return response.json({ ok: true, escalatedCount });
  });

  server.use("/api/auth", authRoutes);
  server.use("/api/cases", caseRoutes);
  server.use("/api/polls", pollRoutes);
  server.use("/api/hub", hubRoutes);
  server.use("/api/admin", adminRoutes);

  server.all("*", (request, response) => handle(request, response));

  await runEscalationSweep();
  setInterval(() => {
    void runEscalationSweep();
  }, 1000 * 60 * 60);

  server.listen(port, () => {
    console.log(`NeoConnect is running at http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start NeoConnect", error);
  process.exit(1);
});