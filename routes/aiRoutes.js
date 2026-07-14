// routes/aiRoutes.js
import express from "express";
import { injectUserCareerContext } from "../middleware/aiContext.js";
import { evaluateResumeATS, simulateInterviewChat, evaluateProject, handleChatbot } from "../controllers/aiController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

// 1. Endpoint for Resume Evaluation Page
router.post("/resume-ats", injectUserCareerContext, evaluateResumeATS);

// 2. Endpoint for Interview Simulation Chat Page
router.post("/interview-chat", injectUserCareerContext, simulateInterviewChat);

// 3. Endpoint for Technical Screening Project Evaluation Page
router.post("/evaluate-project", evaluateProject);

// 4. Site-wide Chatbot Endpoint
router.post("/chatbot", userAuth, handleChatbot);

export default router;