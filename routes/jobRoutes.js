import express from "express";
import { createJob, getDashboardJobs } from "../controllers/jobController.js";

const jobRouter = express.Router();

// GET /api/jobs  — combined platform + external job feed
jobRouter.get("/", getDashboardJobs);

// POST /api/jobs — post a new job (add auth middleware here in production)
jobRouter.post("/", createJob);

export default jobRouter; // ← was `router` (undefined variable)
