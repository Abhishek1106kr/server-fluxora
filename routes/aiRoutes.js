// routes/aiRoutes.js
import express from "express";
import { injectUserCareerContext } from "../middleware/aiContext.js";
import { evaluateResumeATS, simulateInterviewChat } from "../controllers/aiController.js";
// import { protect } from "../middleware/authMiddleware.js"; // Your JWT route protection

const router = express.Router();

// 1. Endpoint for Resume Evaluation Page
router.post("/resume-ats", injectUserCareerContext, evaluateResumeATS);

// 2. Endpoint for Interview Simulation Chat Page
router.post("/interview-chat", injectUserCareerContext, simulateInterviewChat);

export default router;