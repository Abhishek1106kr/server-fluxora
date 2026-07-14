import express from "express";
import { createJob, getDashboardJobs, getMyPostedJobs, updateJob, deleteJob } from "../controllers/jobController.js";
import userAuth from "../middleware/userAuth.js";

const jobRouter = express.Router();

// GET /api/jobs  — combined platform + external job feed
jobRouter.get("/", getDashboardJobs);

// Startup Specific Job management
jobRouter.get("/startup/mine", userAuth, getMyPostedJobs);
jobRouter.post("/", userAuth, createJob);
jobRouter.put("/:id", userAuth, updateJob);
jobRouter.delete("/:id", userAuth, deleteJob);

export default jobRouter;
