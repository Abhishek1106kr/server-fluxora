import { PrismaClient } from "@prisma/client";
import Job from "../models/job.Model.js";
import userModel from "../models/userModel.js";
import { executeAiScreening } from "../services/aiServices.js";

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL
});

export const processStudentAssignment = async (req, res) => {
    try {
        const { mongoJobId } = req.body;
        const studentId = req.userId;

        if (!mongoJobId) {
            return res.status(400).json({ success: false, message: "Job ID is required" });
        }

        const job = await Job.findById(mongoJobId).lean();
        const student = await userModel.findById(studentId).lean();

        if (!job || !student) {
            return res.status(404).json({ success: false, message: "Missing required job or student user profile." });
        }

        // Preventing duplicate applications
        const existingApp = await prisma.application.findUnique({
            where: {
                mongoJobId_studentId: {
                    mongoJobId,
                    studentId
                }
            }
        });

        if (existingApp) {
            return res.status(400).json({ success: false, message: "You have already applied for this role." });
        }

        // Run the Gemini AI screening
        const aiEvaluation = await executeAiScreening(job, student);

        // Save to PostgreSQL via Prisma
        const application = await prisma.application.create({
            data: {
                mongoJobId,
                studentId,
                aiScore: aiEvaluation.projectComplexityScore || 0,
                aiFeedback: {
                    strengths: aiEvaluation.technicalStrengths || [],
                    gaps: aiEvaluation.criticalKnowledgeGaps || [],
                    deductions: aiEvaluation.alignmentDeductions || 0
                },
                status: "PENDING"
            }
        });

        // Return the immediate result to the user
        res.status(201).json({
            success: true,
            data: application
        });

    } catch (error) {
        console.error("Error in processStudentAssignment:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// PUT: Update job application status (For Startup use)
export const updateJobApplicationStatus = async (req, res) => {
    try {
        const { applicationId, status } = req.body; // status: "ACCEPTED" | "REJECTED"

        if (!["ACCEPTED", "REJECTED"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status value" });
        }

        const application = await prisma.application.update({
            where: { id: applicationId },
            data: { status }
        });

        res.status(200).json({ success: true, message: `Application status updated to ${status}.`, data: application });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};