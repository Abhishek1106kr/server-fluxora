import mongoose from "mongoose";
import DevLaunchProject from "../models/DevLaunchProject.js";
import DevLaunchMilestone from "../models/DevLaunchMilestone.js";
import DevLaunchAssessment from "../models/DevLaunchAssessment.js";
import DevLaunchApplication from "../models/DevLaunchApplication.js";
import DevLaunchMessage from "../models/DevLaunchMessage.js";
import userModel from "../models/userModel.js";
import Project from "../models/Project.Model.js";

// --- Project Controllers ---

export const createProject = async (req, res) => {
  try {
    const { title, description, techStack, estimatedDuration } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const project = new DevLaunchProject({
      title,
      description,
      techStack,
      estimatedDuration,
      startupId: req.userId,
    });

    await project.save();
    return res.status(201).json(project);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMyProjects = async (req, res) => {
  try {
    const projects = await DevLaunchProject.find({ startupId: req.userId });
    return res.json(projects);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAllProjects = async (req, res) => {
  try {
    const projects = await DevLaunchProject.find().populate("startupId", "name companyName companyOverview avatar");
    return res.json(projects);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    let project = await DevLaunchProject.findById(id);
    let milestones = [];
    if (!project) {
      project = await Project.findById(id).populate("startupId", "name companyName companyOverview avatar");
    } else {
      milestones = await DevLaunchMilestone.find({ projectId: id }).populate("assignedDeveloper", "name avatar");
    }
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json({ project, milestones });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// --- Milestone Controllers ---

export const createMilestone = async (req, res) => {
  try {
    const { projectId, title, description, techStack, difficulty, duration, requiredScore, deadline } = req.body;
    if (!projectId || !title) {
      return res.status(400).json({ error: "Project ID and Title are required" });
    }

    const milestone = new DevLaunchMilestone({
      projectId,
      startupId: req.userId,
      title,
      description,
      techStack,
      difficulty: difficulty || "intermediate",
      duration,
      requiredScore: requiredScore || 0,
      deadline,
    });

    await milestone.save();
    return res.status(201).json(milestone);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMyMilestonesStartup = async (req, res) => {
  try {
    const milestones = await DevLaunchMilestone.find({ startupId: req.userId })
      .populate("projectId", "title")
      .populate("assignedDeveloper", "name avatar");
    return res.json(milestones);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMyMilestonesDeveloper = async (req, res) => {
  try {
    const milestones = await DevLaunchMilestone.find({ assignedDeveloper: req.userId })
      .populate("projectId", "title")
      .populate("startupId", "name companyName avatar");
    return res.json(milestones);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getOpenMilestones = async (req, res) => {
  try {
    const { search, difficulty, tech } = req.query;
    const filter = { status: "open" };

    if (difficulty) {
      filter.difficulty = difficulty;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (tech) {
      const techArray = tech.split(",").map((t) => t.trim());
      filter.techStack = { $in: techArray };
    }

    const milestones = await DevLaunchMilestone.find(filter)
      .populate("startupId", "name companyName companyOverview avatar");
    return res.json(milestones);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMilestoneById = async (req, res) => {
  try {
    const { id } = req.params;
    const milestone = await DevLaunchMilestone.findById(id)
      .populate("projectId", "title description techStack estimatedDuration")
      .populate("startupId", "name companyName companyOverview avatar")
      .populate("assignedDeveloper", "name github avatar");

    if (!milestone) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    return res.json(milestone);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};
    if (req.body.kanban !== undefined) updateData.kanban = req.body.kanban;
    if (req.body.status !== undefined) updateData.status = req.body.status;

    const milestone = await DevLaunchMilestone.findByIdAndUpdate(id, updateData, { new: true });
    if (!milestone) {
      return res.status(404).json({ error: "Milestone not found" });
    }
    return res.json(milestone);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// --- Application Controllers ---

export const applyToMilestone = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    
    // Check if application already exists
    const existingApp = await DevLaunchApplication.findOne({ milestoneId, developerId: req.userId });
    if (existingApp) {
      return res.json(existingApp);
    }

    const application = new DevLaunchApplication({
      milestoneId,
      developerId: req.userId,
    });

    await application.save();
    return res.status(201).json(application);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMilestoneApplications = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const applications = await DevLaunchApplication.find({ milestoneId })
      .populate("developerId", "name email github skills rating ratingCount avatar");
    return res.json(applications);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMyApplications = async (req, res) => {
  try {
    const applications = await DevLaunchApplication.find({ developerId: req.userId })
      .populate("milestoneId", "title difficulty duration status");
    return res.json(applications);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// --- Assessment Controllers ---

export const createAssessment = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const { questions, passingScore } = req.body;

    const assessment = await DevLaunchAssessment.findOneAndUpdate(
      { milestoneId },
      { questions, passingScore },
      { new: true, upsert: true }
    );

    return res.json(assessment);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAssessment = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const assessment = await DevLaunchAssessment.findOne({ milestoneId });
    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    // Strip out the correctIndex answer options when serving to dev
    const cleanQuestions = assessment.questions.map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options,
    }));

    return res.json({
      _id: assessment._id,
      milestoneId: assessment.milestoneId,
      questions: cleanQuestions,
      passingScore: assessment.passingScore,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const submitAssessment = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const { answers } = req.body;

    const assessment = await DevLaunchAssessment.findOne({ milestoneId });
    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    let correctCount = 0;
    assessment.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / assessment.questions.length) * 100);
    const passed = score >= assessment.passingScore;

    // Update application
    await DevLaunchApplication.findOneAndUpdate(
      { milestoneId, developerId: req.userId },
      { assessmentScore: score, assessmentPassed: passed },
      { new: true }
    );

    return res.json({ score, passed, passingScore: assessment.passingScore });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// --- Assign / Complete Controllers ---

export const assignDeveloper = async (req, res) => {
  try {
    const { id } = req.params; // milestoneId
    const { applicationId } = req.body;

    const application = await DevLaunchApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    // Update milestone
    const milestone = await DevLaunchMilestone.findByIdAndUpdate(
      id,
      {
        assignedDeveloper: application.developerId,
        status: "in_progress",
      },
      { new: true }
    );

    // Update application status
    application.status = "approved";
    await application.save();

    // Reject other applications
    await DevLaunchApplication.updateMany(
      { milestoneId: id, _id: { $ne: applicationId } },
      { status: "rejected" }
    );

    return res.json({ success: true, milestone });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const completeMilestone = async (req, res) => {
  try {
    const { id } = req.params; // milestoneId
    const { rating } = req.body;

    const milestone = await DevLaunchMilestone.findById(id);
    if (!milestone) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    milestone.status = "completed";
    if (rating !== undefined) {
      milestone.rating = rating;
    }
    await milestone.save();

    // Update Developer Rating
    if (milestone.assignedDeveloper && rating !== undefined) {
      const dev = await userModel.findById(milestone.assignedDeveloper);
      if (dev) {
        const currentCount = dev.ratingCount || 0;
        const currentRating = dev.rating || 0;
        dev.rating = (currentRating * currentCount + rating) / (currentCount + 1);
        dev.ratingCount = currentCount + 1;
        await dev.save();
      }
    }

    return res.json({ success: true, milestone });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// --- Chat Messages Controllers ---

export const getMessages = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const messages = await DevLaunchMessage.find({ milestoneId }).sort({ createdAt: 1 });
    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// --- Matching Recommendations Controller ---

export const getMatchingRecommendations = async (req, res) => {
  try {
    const dev = await userModel.findById(req.userId);
    if (!dev) {
      return res.status(404).json({ error: "Developer not found" });
    }

    const devSkills = (dev.skills || []).map((s) => s.toLowerCase());

    // Fetch all open milestones
    const openMilestones = await DevLaunchMilestone.find({ status: "open" })
      .populate("startupId", "name companyName avatar");

    const recommendations = [];

    openMilestones.forEach((m) => {
      const milestoneSkills = (m.techStack || []).map((s) => s.toLowerCase());
      if (milestoneSkills.length === 0) {
        recommendations.push({ milestone: m, matchScore: 100 });
        return;
      }

      // Count matches
      const matchingCount = milestoneSkills.filter((s) => devSkills.includes(s)).length;
      const matchScore = Math.round((matchingCount / milestoneSkills.length) * 100);

      // Return matches with score > 20%
      if (matchScore >= 20 || devSkills.length === 0) {
        recommendations.push({ milestone: m, matchScore });
      }
    });

    // Sort by match score descending
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    return res.json(recommendations);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
