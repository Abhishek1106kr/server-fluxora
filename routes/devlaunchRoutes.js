import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  createProject,
  getMyProjects,
  getAllProjects,
  getProjectById,
  createMilestone,
  getMyMilestonesStartup,
  getMyMilestonesDeveloper,
  getOpenMilestones,
  getMilestoneById,
  updateMilestone,
  applyToMilestone,
  getMilestoneApplications,
  getMyApplications,
  createAssessment,
  getAssessment,
  submitAssessment,
  assignDeveloper,
  completeMilestone,
  getMessages,
  getMatchingRecommendations,
} from "../controllers/devlaunchController.js";

const router = express.Router();

// Project routes
router.post("/projects", userAuth, createProject);
router.get("/projects/my/projects", userAuth, getMyProjects);
router.get("/projects", getAllProjects);
router.get("/projects/:id", getProjectById);

// Milestone routes
router.post("/milestones", userAuth, createMilestone);
router.get("/milestones/startup/mine", userAuth, getMyMilestonesStartup);
router.get("/milestones/developer/mine", userAuth, getMyMilestonesDeveloper);
router.get("/milestones", getOpenMilestones);
router.get("/milestones/:id", getMilestoneById);
router.put("/milestones/:id", userAuth, updateMilestone);
router.post("/milestones/:id/assign", userAuth, assignDeveloper);
router.post("/milestones/:id/complete", userAuth, completeMilestone);

// Application routes
router.post("/applications/:milestoneId", userAuth, applyToMilestone);
router.get("/applications/milestone/:milestoneId", userAuth, getMilestoneApplications);
router.get("/applications/mine", userAuth, getMyApplications);

// Assessment routes
router.post("/assessments/:milestoneId", userAuth, createAssessment);
router.get("/assessments/:milestoneId", userAuth, getAssessment);
router.post("/assessments/:milestoneId/submit", userAuth, submitAssessment);

// Chat Message routes
router.get("/messages/:milestoneId", userAuth, getMessages);

// Recommendation matching routes
router.get("/matching/recommendations", userAuth, getMatchingRecommendations);

export default router;
