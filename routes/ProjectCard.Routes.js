import express from "express";
import {
  initializeProjectCard,
  activateProjectCollaboration,
  completedProjectCard,
  getAllProjectCards,
  submitProjectAssessment,
  applyToProject,
  getProjectApplications,
  updateApplicationStatus,
  getMyApplicationStatus,
  getStartupWorkspaces,
  updateProjectCard,
  deleteProjectCard,
  getMyPostedProjects,
  getStartupProjectApplications,
  getStudentActiveWorkspaces,
  createProjectMilestone,
  updateMilestoneStatus,
  getWorkspaceDiscussions,
  createWorkspaceDiscussion,
  getWorkspaceCommits,
  createWorkspaceCommit
} from "../controllers/project.Controller.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.get("/all", getAllProjectCards);
router.post("/create", userAuth, initializeProjectCard);
router.post("/activate", userAuth, activateProjectCollaboration);
router.put("/complete/:mongoJobId", userAuth, completedProjectCard);

// Application and Assessment Flow
router.post("/assessment/submit", userAuth, submitProjectAssessment);
router.post("/apply", userAuth, applyToProject);
router.get("/applications/:projectId", userAuth, getProjectApplications);
router.put("/application/status", userAuth, updateApplicationStatus);
router.get("/my-application/:projectId", userAuth, getMyApplicationStatus);
router.get("/startup/workspaces", userAuth, getStartupWorkspaces);

// Startup Specific Project management
router.get("/startup/mine", userAuth, getMyPostedProjects);
router.put("/:id", userAuth, updateProjectCard);
router.delete("/:id", userAuth, deleteProjectCard);
router.get("/startup/applications", userAuth, getStartupProjectApplications);

// Student Specific Workspace & Milestones
router.get("/student/workspaces", userAuth, getStudentActiveWorkspaces);
router.post("/milestones", userAuth, createProjectMilestone);
router.put("/milestones/status", userAuth, updateMilestoneStatus);

// Active Workspace Discussions & Commits
router.get("/workspaces/:projectStateId/discussions", userAuth, getWorkspaceDiscussions);
router.post("/workspaces/:projectStateId/discussions", userAuth, createWorkspaceDiscussion);
router.get("/workspaces/:projectStateId/commits", userAuth, getWorkspaceCommits);
router.post("/workspaces/:projectStateId/commits", userAuth, createWorkspaceCommit);

export default router;
