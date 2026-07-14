import express from "express";
import { processStudentAssignment, updateJobApplicationStatus } from "../controllers/Assessment.Controller.js";
import { processStudentApplication, getStartupApplications } from "../controllers/applicationController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.post("/apply", userAuth, processStudentAssignment);
router.post("/job-apply", userAuth, processStudentApplication);
router.get("/startup/all", userAuth, getStartupApplications);
router.put("/status", userAuth, updateJobApplicationStatus);

export default router;
