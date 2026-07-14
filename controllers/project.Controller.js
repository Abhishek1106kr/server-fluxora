import mongoose from "mongoose";
import Project from "../models/Project.Model.js";
import ProjectState from "../models/ProjectState.Model.js";
import userModel from "../models/userModel.js";
import ProjectApplication from "../models/ProjectApplication.js";
import WorkspaceCommit from "../models/WorkspaceCommit.js";
import WorkspaceDiscussion from "../models/WorkspaceDiscussion.js";
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL
});

export const initializeProjectCard = async (req, res) => {
    try {
        const { title, description, targetRole, requiredSkills, stipend, duration, repositoryUrl, eligibilityCriteria } = req.body;
        const startupId = req.userId || req.body.startupId;

        if (!startupId) {
            return res.status(400).json({ success: false, message: "Startup ID is required" });
        }

        // Verify the startup exists and has the correct role
        const startupUser = await userModel.findById(startupId);
        if (!startupUser) {
            return res.status(404).json({ success: false, message: "Startup partner not found" });
        }

        if (startupUser.role !== "startup") {
            return res.status(403).json({ success: false, message: "Only startup accounts can initialize project cards" });
        }

        // Create a persistent public metadata document in MongoDB
        const newProject = await Project.create({
            title,
            description,
            targetRole,
            requiredSkills,
            stipend,
            duration,
            repositoryUrl,
            eligibilityCriteria,
            startupId
        });

        // Initialize corresponding operational lifecycle status in MongoDB
        const opstate = await ProjectState.create({
            mongoJobId: newProject._id.toString(),
            lifecycleStatus: "DISCOVERY"
        });

        // Sync with PostgreSQL via Prisma
        let pgState = null;
        try {
            pgState = await prisma.projectState.create({
                data: {
                    mongoJobId: newProject._id.toString(),
                    lifecycleStatus: "DISCOVERY"
                }
            });
        } catch (pgError) {
            console.warn("Prisma PostgreSQL write skipped/failed:", pgError.message);
        }

        res.status(201).json({
            success: true,
            message: "Project card initialized successfully across ecosystem.",
            mongoData: newProject,
            postgresData: pgState || opstate
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to initialize project",
            error: error.message
        });
    }
};

// Active Transition (Startup Accepts Student -> Work Begins)
export const activateProjectCollaboration = async (req, res) => {
    try {
        const { mongoJobId, studentId } = req.body;

        // Verify the student exists and has developer role
        const studentUser = await userModel.findById(studentId);
        if (!studentUser) {
            return res.status(404).json({ success: false, message: "Assigned student partner not found" });
        }
        if (studentUser.role !== "developer") {
            return res.status(403).json({ success: false, message: "Only developer accounts can be assigned to active projects" });
        }
        
        const updateState = await ProjectState.findOneAndUpdate(
            { mongoJobId },
            {
                studentId,
                lifecycleStatus: "ACTIVE_WORK",
                currentMilestone: 1
            },
            { new: true }
        );

        if (!updateState) {
            return res.status(404).json({
                success: false,
                message: "Target project tracker not found."
            });
        }

        // Sync with PostgreSQL via Prisma
        try {
            await prisma.projectState.upsert({
                where: { mongoJobId },
                update: {
                    studentId,
                    lifecycleStatus: "ACTIVE_WORK",
                    currentMilestone: 1
                },
                create: {
                    mongoJobId,
                    studentId,
                    lifecycleStatus: "ACTIVE_WORK",
                    currentMilestone: 1
                }
            });
        } catch (pgError) {
            console.warn("Prisma PostgreSQL update skipped/failed:", pgError.message);
        }

        res.status(200).json({
            success: true,
            message: "Collaboration Initialized. Github Webhook Sync Loops are now active.",
            data: updateState
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Completion (Milestone met and Codebase merged successfully)
export const completedProjectCard = async (req, res) => {
    try {
        const mongoJobId = req.params.mongoJobId || req.body.mongoJobId;

        const closedState = await ProjectState.findOneAndUpdate(
            { mongoJobId },
            { lifecycleStatus: "COMPLETED" },
            { new: true }
        );

        if (!closedState) {
            return res.status(404).json({
                success: false,
                message: "Tracked project not found."
            });
        }

        // Sync with PostgreSQL via Prisma
        try {
            await prisma.projectState.upsert({
                where: { mongoJobId },
                update: { lifecycleStatus: "COMPLETED" },
                create: {
                    mongoJobId,
                    lifecycleStatus: "COMPLETED"
                }
            });
        } catch (pgError) {
            console.warn("Prisma PostgreSQL completion sync skipped/failed:", pgError.message);
        }

        res.status(200).json({
            success: true,
            message: "Project lifecycle archived to COMPLETED.",
            data: closedState
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get all project cards merged with their lifecycle states
export const getAllProjectCards = async (req, res) => {
    try {
        const projects = await Project.find().populate("startupId", "name companyName companyOverview avatar").lean();
        
        // Read lifecycle states from PostgreSQL via Prisma, fallback to MongoDB if unreachable
        let states = [];
        try {
            states = await prisma.projectState.findMany();
        } catch (pgError) {
            console.warn("Prisma PostgreSQL read failed, falling back to MongoDB state collection:", pgError.message);
            states = await ProjectState.find().lean();
        }

        // Merge state with project details
        const merged = projects.map(proj => {
            const state = states.find(s => s.mongoJobId === proj._id.toString());
            return {
                ...proj,
                state: state || { lifecycleStatus: "DISCOVERY", currentMilestone: 0 }
            };
        });

        res.status(200).json({
            success: true,
            data: merged
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST: Submit developer project assessment
export const submitProjectAssessment = async (req, res) => {
    try {
        const { projectId, studentSkills, projectDescription, repositoryUrl } = req.body;
        const studentId = req.userId;

        if (!projectId || !projectDescription) {
            return res.status(400).json({ success: false, message: "Project ID and Description are required" });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        const requiredSkills = project.requiredSkills || [];
        const requiredSkillsStr = requiredSkills.join(", ");
        const studentSkillsArray = studentSkills ? studentSkills.split(",").map(s => s.trim()).filter(Boolean) : [];

        // Build the prompt for technical assessment evaluation
        const systemPrompt = `You are the Technical Assessment Engine for Fluxora. Grade the candidate's project/technical depth against the requirements of the role "${project.targetRole}" and the target stack [${requiredSkillsStr}].
        
        Opportunity Description: "${project.description}"
        Student Project Description: "${projectDescription}"
        Student Skills: [${studentSkillsArray.join(", ")}]
        
        Compute:
        1. projectComplexityScore (0-100): High score for microservices, websockets, real-time queues, deep architecture. Low score for simple static apps.
        2. alignmentDeductions (0-40): Deduction points based on missing stack overlaps.
        3. technicalStrengths (Array of 1 to 3 items): Key highlights.
        4. criticalKnowledgeGaps (Array of 1 to 3 items): Concepts missing.

        Output strictly a valid JSON block matching this schema:
        {
          "projectComplexityScore": <integer between 0 and 100>,
          "alignmentDeductions": <integer showing point deductions>,
          "technicalStrengths": ["strength1", "strength2"],
          "criticalKnowledgeGaps": ["gap1", "gap2"]
        }
        Do not output any introductory or concluding text. Output only raw JSON.`;

        let evaluation = {
            projectComplexityScore: 75,
            alignmentDeductions: 5,
            technicalStrengths: ["Demonstrates solid understanding of stack", "Modular code structure"],
            criticalKnowledgeGaps: ["Could improve error handling mechanisms"]
        };

        try {
            const { GoogleGenAI } = await import("@google/genai");
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

            const geminiResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: systemPrompt,
                config: {
                    temperature: 0.2,
                    responseMimeType: "application/json"
                }
            });

            const resultText = geminiResponse.text?.trim() || "{}";
            const cleaned = resultText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            evaluation = JSON.parse(cleaned);
        } catch (aiError) {
            console.warn("Gemini AI evaluation offline/unauthorized, falling back to algorithmic scorecard:", aiError.message);
            // Algorithmic evaluation based on matching skills
            const matchingCount = requiredSkills.filter(skill => 
                studentSkillsArray.some(s => s.toLowerCase() === skill.toLowerCase())
            ).length;
            const skillRatio = requiredSkills.length > 0 ? (matchingCount / requiredSkills.length) : 1;
            
            evaluation = {
                projectComplexityScore: Math.round(60 + (skillRatio * 30)),
                alignmentDeductions: Math.round((1 - skillRatio) * 30),
                technicalStrengths: [
                    "Strong alignment with requested core stack",
                    "Demonstrated ability to configure repository environment"
                ],
                criticalKnowledgeGaps: requiredSkills.length > matchingCount 
                    ? ["Deepen familiarity with: " + requiredSkills.filter(s => !studentSkillsArray.some(x => x.toLowerCase() === s.toLowerCase())).join(", ")]
                    : ["Advanced system optimizations and profiling"]
            };
        }

        const score = Math.max(0, Math.min(100, (evaluation.projectComplexityScore || 0) - (evaluation.alignmentDeductions || 0)));
        const minScore = project.eligibilityCriteria?.minAssessmentScore || 70;
        const passed = score >= minScore;

        // Upsert the project application
        const application = await ProjectApplication.findOneAndUpdate(
            { 
                projectId: new mongoose.Types.ObjectId(projectId), 
                studentId: new mongoose.Types.ObjectId(studentId) 
            },
            {
                assessmentScore: score,
                passed,
                technicalStrengths: evaluation.technicalStrengths || [],
                criticalKnowledgeGaps: evaluation.criticalKnowledgeGaps || [],
                submittedAnswers: {
                    studentSkills,
                    projectDescription,
                    repositoryUrl
                }
            },
            { new: true, upsert: true }
        );

        res.status(200).json({
            success: true,
            message: passed ? "Assessment passed! You can now submit your application." : "Assessment completed.",
            data: application
        });

    } catch (error) {
        console.error("Error submitting project assessment:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST: Submit formal project application after taking assessment
export const applyToProject = async (req, res) => {
    try {
        const { projectId } = req.body;
        const studentId = req.userId;

        const application = await ProjectApplication.findOne({ 
            projectId: new mongoose.Types.ObjectId(projectId), 
            studentId: new mongoose.Types.ObjectId(studentId) 
        });
        if (!application) {
            return res.status(400).json({ success: false, message: "Please take the assessment before applying." });
        }

        if (!application.passed) {
            return res.status(400).json({ success: false, message: "Your assessment score does not meet the eligibility criteria for this project." });
        }

        application.status = "applied";
        await application.save();

        res.status(200).json({
            success: true,
            message: "Application submitted successfully! The startup partner will review your technical scorecard.",
            data: application
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET: Retrieve all applications for a project (For Startup use)
export const getProjectApplications = async (req, res) => {
    try {
        const { projectId } = req.params;
        const applications = await ProjectApplication.find({ projectId: new mongoose.Types.ObjectId(projectId) })
            .populate("studentId", "name email skills avatar companyName companyOverview")
            .lean();

        res.status(200).json({
            success: true,
            data: applications
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PUT: Accept or Reject developer application
export const updateApplicationStatus = async (req, res) => {
    try {
        const { applicationId, status } = req.body; // status: "accepted" | "rejected"
        
        if (!["accepted", "rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status value" });
        }

        const application = await ProjectApplication.findById(applicationId);
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        application.status = status;
        await application.save();

        // If accepted, transition project state to ACTIVE_WORK and assign the student
        if (status === "accepted") {
            const updateState = await ProjectState.findOneAndUpdate(
                { mongoJobId: application.projectId.toString() },
                {
                    studentId: application.studentId.toString(),
                    lifecycleStatus: "ACTIVE_WORK",
                    currentMilestone: 1
                },
                { new: true, upsert: true }
            );

            // Sync with PostgreSQL via Prisma
            try {
                await prisma.projectState.upsert({
                    where: { mongoJobId: application.projectId.toString() },
                    update: {
                        studentId: application.studentId.toString(),
                        lifecycleStatus: "ACTIVE_WORK",
                        currentMilestone: 1
                    },
                    create: {
                        mongoJobId: application.projectId.toString(),
                        studentId: application.studentId.toString(),
                        lifecycleStatus: "ACTIVE_WORK",
                        currentMilestone: 1
                    }
                });
            } catch (pgError) {
                console.warn("Prisma PostgreSQL accept sync failed:", pgError.message);
            }
        }

        res.status(200).json({
            success: true,
            message: `Application has been ${status} successfully.`,
            data: application
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET: Retrieve current user's application details for a specific project
export const getMyApplicationStatus = async (req, res) => {
    try {
        const { projectId } = req.params;
        const studentId = req.userId;

        const application = await ProjectApplication.findOne({ 
            projectId: new mongoose.Types.ObjectId(projectId), 
            studentId: new mongoose.Types.ObjectId(studentId) 
        });
        
        res.status(200).json({
            success: true,
            data: application || null
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET: Retrieve startup's active workspaces/collaborations
export const getStartupWorkspaces = async (req, res) => {
    try {
        const startupId = req.userId;
        const projects = await Project.find({ startupId }).populate("startupId", "name companyName companyOverview avatar").lean();
        
        let states = [];
        try {
            states = await prisma.projectState.findMany({
                where: { studentId: { not: null } }
            });
        } catch (pgError) {
            states = await ProjectState.find({ studentId: { $ne: null } }).lean();
        }

        const active = projects.map(proj => {
            const state = states.find(s => s.mongoJobId === proj._id.toString());
            return state ? { ...proj, state } : null;
        }).filter(Boolean);

        res.status(200).json({ success: true, data: active });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PUT: Update an existing project card (CRUD)
export const updateProjectCard = async (req, res) => {
    try {
        const { id } = req.params;
        const startupId = req.userId;
        const { title, description, targetRole, requiredSkills, stipend, duration, repositoryUrl, eligibilityCriteria } = req.body;

        const project = await Project.findOneAndUpdate(
            { _id: id, startupId },
            {
                title,
                description,
                targetRole,
                requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : (requiredSkills ? [requiredSkills] : []),
                stipend,
                duration,
                repositoryUrl,
                eligibilityCriteria
            },
            { new: true }
        );

        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found or unauthorized" });
        }

        res.status(200).json({ success: true, message: "Project card updated successfully", data: project });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// DELETE: Delete a project card (CRUD)
export const deleteProjectCard = async (req, res) => {
    try {
        const { id } = req.params;
        const startupId = req.userId;

        const project = await Project.findOneAndDelete({ _id: id, startupId });
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found or unauthorized" });
        }

        // Clean up project states and Prisma syncs
        await ProjectState.deleteMany({ mongoJobId: id });
        try {
            await prisma.projectState.delete({
                where: { mongoJobId: id }
            });
        } catch (pgError) {
            console.warn("Prisma project deletion sync failed:", pgError.message);
        }

        res.status(200).json({ success: true, message: "Project card deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET: Retrieve project cards owned by startup
export const getMyPostedProjects = async (req, res) => {
    try {
        const startupId = req.userId;
        const projects = await Project.find({ startupId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: projects });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET: Retrieve all candidate applications for all projects owned by this startup
export const getStartupProjectApplications = async (req, res) => {
    try {
        const startupId = req.userId;
        const projects = await Project.find({ startupId }).select("_id");
        const projectIds = projects.map(p => p._id);

        const applications = await ProjectApplication.find({ projectId: { $in: projectIds } })
            .populate("studentId", "name email skills avatar")
            .populate("projectId", "title")
            .lean();

        // Standardize output shape to match job applications:
        const formatted = applications.map(app => ({
            id: app._id.toString(),
            mongoJobId: app.projectId?._id?.toString(),
            studentId: app.studentId?._id?.toString(),
            aiScore: app.assessmentScore || 0,
            aiFeedback: {
                strengths: app.technicalStrengths || [],
                gaps: app.criticalKnowledgeGaps || []
            },
            status: app.passed ? "ACCEPTED" : "PENDING", // passed flag sets status
            createdAt: app.createdAt,
            student: app.studentId,
            jobTitle: app.projectId?.title || "Unknown Project"
        }));

        res.status(200).json({ success: true, data: formatted });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET: Retrieve developer's active project workspaces
export const getStudentActiveWorkspaces = async (req, res) => {
    try {
        const studentId = req.userId;

        // 1. Fetch projectStates from Postgres where studentId matches and status is ACTIVE_WORK
        let activeStates = [];
        try {
            activeStates = await prisma.projectState.findMany({
                where: { 
                    studentId,
                    lifecycleStatus: "ACTIVE_WORK"
                },
                include: {
                    milestones: {
                        orderBy: { createdAt: "asc" }
                    }
                }
            });
        } catch (pgError) {
            // Fallback to MongoDB
            const mongoStates = await ProjectState.find({
                studentId,
                lifecycleStatus: "ACTIVE_WORK"
            }).lean();
            activeStates = mongoStates.map(s => ({
                id: s._id.toString(),
                mongoJobId: s.mongoJobId,
                studentId: s.studentId,
                lifecycleStatus: s.lifecycleStatus,
                currentMilestone: s.currentMilestone,
                milestones: (s.milestones || []).map(m => ({
                    id: m._id.toString(),
                    projectStateId: s._id.toString(),
                    title: m.title,
                    description: m.description,
                    prNumber: m.prNumber,
                    status: m.status,
                    feedback: m.feedback,
                    createdAt: m.createdAt,
                    updatedAt: m.updatedAt
                }))
            }));
        }

        if (activeStates.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const projectIds = activeStates.map(s => s.mongoJobId);
        
        // 2. Fetch corresponding MongoDB Projects
        const projects = await Project.find({ _id: { $in: projectIds } })
            .populate("startupId", "name companyName companyOverview avatar")
            .lean();

        // 3. Assemble response objects
        const workspaces = activeStates.map(state => {
            const project = projects.find(p => p._id.toString() === state.mongoJobId);
            if (!project) return null;
            return {
                ...project,
                state
            };
        }).filter(Boolean);

        res.status(200).json({ success: true, data: workspaces });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST: Create a new milestone for a project workspace
export const createProjectMilestone = async (req, res) => {
    try {
        const { projectStateId, title, description, prNumber } = req.body;

        let milestone = null;
        try {
            milestone = await prisma.milestone.create({
                data: {
                    projectStateId,
                    title,
                    description,
                    prNumber: prNumber ? Number(prNumber) : null,
                    status: "PENDING"
                }
            });
        } catch (pgError) {
            console.warn("Prisma PostgreSQL milestone creation failed, trying MongoDB:", pgError.message);
        }

        // Also save to MongoDB ProjectState milestones array
        const updateState = await ProjectState.findOneAndUpdate(
            { $or: [
                { _id: mongoose.Types.ObjectId.isValid(projectStateId) ? new mongoose.Types.ObjectId(projectStateId) : null },
                { mongoJobId: projectStateId }
            ].filter(Boolean) },
            {
                $push: {
                    milestones: {
                        title,
                        description,
                        prNumber: prNumber ? Number(prNumber) : null,
                        status: "PENDING"
                    }
                }
            },
            { new: true, upsert: true }
        );

        if (!milestone && updateState && updateState.milestones.length > 0) {
            const newlyAdded = updateState.milestones[updateState.milestones.length - 1];
            milestone = {
                id: newlyAdded._id.toString(),
                projectStateId: updateState._id.toString(),
                title: newlyAdded.title,
                description: newlyAdded.description,
                prNumber: newlyAdded.prNumber,
                status: newlyAdded.status,
                feedback: newlyAdded.feedback,
                createdAt: newlyAdded.createdAt,
                updatedAt: newlyAdded.updatedAt
            };
        }

        res.status(201).json({ success: true, data: milestone });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PUT: Update milestone status (approve/reject milestone by Startup)
export const updateMilestoneStatus = async (req, res) => {
    try {
        const { milestoneId, status, feedback } = req.body;
        
        if (!["MERGED", "REJECTED", "UNDER_REVIEW", "PENDING", "PR_OPEN"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid milestone status" });
        }

        let milestone = null;
        let projectStateId = null;
        let prNumber = null;

        try {
            milestone = await prisma.milestone.update({
                where: { id: milestoneId },
                data: { 
                    status,
                    feedback: status === "REJECTED" ? feedback : null
                }
            });
            projectStateId = milestone.projectStateId;
            prNumber = milestone.prNumber;
        } catch (pgError) {
            console.warn("Prisma PostgreSQL milestone status update skipped:", pgError.message);
        }

        // Also update in MongoDB ProjectState milestones array
        const updatedDoc = await ProjectState.findOneAndUpdate(
            { "milestones._id": mongoose.Types.ObjectId.isValid(milestoneId) ? new mongoose.Types.ObjectId(milestoneId) : null },
            {
                $set: {
                    "milestones.$.status": status,
                    "milestones.$.feedback": status === "REJECTED" ? feedback : null,
                    "milestones.$.updatedAt": new Date()
                }
            },
            { new: true }
        );

        let mongoJobId = null;
        if (updatedDoc) {
            mongoJobId = updatedDoc.mongoJobId;
            const updatedMilestone = updatedDoc.milestones.find(m => m._id.toString() === milestoneId);
            if (!milestone && updatedMilestone) {
                milestone = {
                    id: updatedMilestone._id.toString(),
                    projectStateId: updatedDoc._id.toString(),
                    title: updatedMilestone.title,
                    description: updatedMilestone.description,
                    prNumber: updatedMilestone.prNumber,
                    status: updatedMilestone.status,
                    feedback: updatedMilestone.feedback,
                    createdAt: updatedMilestone.createdAt,
                    updatedAt: updatedMilestone.updatedAt
                };
                prNumber = updatedMilestone.prNumber;
            }
        }

        if (!projectStateId && updatedDoc) {
            projectStateId = updatedDoc._id.toString();
        }

        // Get projectState to get the mongoJobId for socket broadcast
        let finalMongoJobId = mongoJobId;
        if (!finalMongoJobId && projectStateId) {
            try {
                const projectState = await prisma.projectState.findUnique({
                    where: { id: projectStateId }
                });
                if (projectState) finalMongoJobId = projectState.mongoJobId;
            } catch (err) {}
        }

        if (finalMongoJobId) {
            // Broadcast live update
            const io = (await import("../index.js")).io;
            io.to(`project_${finalMongoJobId}`).emit("milestone_update", {
                prNumber,
                status
            });
        }

        res.status(200).json({ success: true, message: "Milestone updated successfully", data: milestone });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET: Retrieve all discussions for a project workspace
export const getWorkspaceDiscussions = async (req, res) => {
    try {
        const { projectStateId } = req.params;
        const discussions = await WorkspaceDiscussion.find({ projectStateId })
            .sort({ createdAt: -1 })
            .lean();
        
        res.status(200).json({ success: true, data: discussions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST: Add a new comment/discussion in the workspace
export const createWorkspaceDiscussion = async (req, res) => {
    try {
        const { projectStateId } = req.params;
        const { content, attachments = [] } = req.body;
        const userId = req.userId;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const roleLabel = user.role === "startup" ? "Startup Maintainer" : "Student Developer";

        const newDiscussion = await WorkspaceDiscussion.create({
            projectStateId,
            author: user.name,
            role: roleLabel,
            avatar: user.avatar || "",
            content,
            attachments
        });

        // Broadcast comment live to the workspace room
        const io = (await import("../index.js")).io;
        io.to(`project_${projectStateId}`).emit("new_discussion_post", newDiscussion);

        res.status(201).json({ success: true, data: newDiscussion });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET: Retrieve commits history for a workspace
export const getWorkspaceCommits = async (req, res) => {
    try {
        const { projectStateId } = req.params;
        const commits = await WorkspaceCommit.find({ projectStateId })
            .sort({ createdAt: -1 })
            .lean();
        
        res.status(200).json({ success: true, data: commits });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST: Log a commit manually (e.g. for developer simulation, checks)
export const createWorkspaceCommit = async (req, res) => {
    try {
        const { projectStateId } = req.params;
        const { author, message, filesChanged, additions, deletions, branch } = req.body;

        const newCommit = await WorkspaceCommit.create({
            projectStateId,
            author: author || "Test Student",
            avatar: "",
            message,
            filesChanged: Number(filesChanged) || 0,
            additions: Number(additions) || 0,
            deletions: Number(deletions) || 0,
            branch: branch || "main"
        });

        // Broadcast commit activity live
        const io = (await import("../index.js")).io;
        io.to(`project_${projectStateId}`).emit("commit_push", newCommit);

        res.status(201).json({ success: true, data: newCommit });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};