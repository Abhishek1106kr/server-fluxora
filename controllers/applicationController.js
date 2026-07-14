import Application from "../models/Application.Model.js";
import Job from "../models/job.Model.js";
import User from "../models/userModel.js";
import AssessmentTemplate from "../models/Assessment.Model.js";
import { GoogleGenAI } from "@google/genai";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const processStudentApplication = async (req, res) => {
  try {
    const { jobId, studentAnswers } = req.body;
    const studentId = req.user?._id || req.body.studentId; 

    // 1. Gather Job & Candidate Profiles
    const job = await Job.findById(jobId).lean();
    const student = await User.findById(studentId).lean();

    if (!job || !student) {
      return res.status(404).json({ success: false, message: "Target profile contexts invalid." });
    }

    // --- LAYER 1: Grade Predefined Technical Assessment ---
    const assessment = await AssessmentTemplate.findOne({ targetRole: job.title }).lean() || await AssessmentTemplate.findOne({ targetRole: job.targetRole }).lean();
    let correctCount = 0;
    
    if (assessment) {
      const questionsList = assessment.questions || [];
      questionsList.forEach((q, index) => {
        const studentChoice = (studentAnswers || []).find(ans => 
          (ans.questionId && q._id && ans.questionId === q._id.toString()) ||
          (ans.questionText && q.questionText && ans.questionText.trim() === q.questionText.trim()) ||
          ans.index === index
        );
        const correctIndex = q.correctAnswerIndex !== undefined ? q.correctAnswerIndex : q.correctOptionIndex;
        if (studentChoice && Number(studentChoice.chosenIndex) === correctIndex) {
          correctCount++;
        }
      });
    }
    const assessmentScore = (assessment && assessment.questions?.length) ? Math.round((correctCount / assessment.questions.length) * 100) : 0;

    // --- LAYER 2: Algorithm-Driven Skill Matching ---
    const requestedSkills = job.requiredSkills || [];
    const studentSkills = student.skills || [];
    const matchingSkills = requestedSkills.filter(skill => 
      studentSkills.some(s => s.toLowerCase() === skill.toLowerCase())
    );
    const skillsMatchScore = requestedSkills.length > 0 ? Math.round((matchingSkills.length / requestedSkills.length) * 100) : 0;

    // --- LAYER 3: Automated AI Evaluation of Student's Best Project ---
    const topProjectDesc = student.topProjectDescription || "No project highlights provided.";
    const projectRepoUrl = student.topProjectUrl || "No link active.";

    const aiPrompt = `
      You are an elite Tech Lead auditing student project metrics.
      Evaluate the complexity, utility, and tech-stack maturity of this project portfolio:
      - Project Description: ${topProjectDesc}
      - Repository Target: ${projectRepoUrl}
      
      Provide a strict JSON output matching this schema:
      {
        "projectComplexityScore": <number between 0 and 100 based on modern coding standards>
      }
    `;

    let projectScore = 50; // Fallback median configuration
    try {
      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
        config: { responseMimeType: "application/json" }
      });
      const parsedScore = JSON.parse(aiResponse.text);
      projectScore = parsedScore.projectComplexityScore || 50;
    } catch (aiErr) {
      console.error("Gemini project auditing offline, falling back to basic evaluation index.");
    }

    // --- LEADERBOARD WEIGHT COMPILATION ---
    // 40% Test Performance, 30% Tech Stack Match, 30% Project Depth Build
    const totalWeightedScore = Math.round(
      (assessmentScore * 0.4) + (skillsMatchScore * 0.3) + (projectScore * 0.3)
    );

    // 2. Save inside the collection leaderboard framework
    const finalScorecard = await Application.create({
      jobId,
      studentId,
      scores: { assessmentScore, projectScore, skillsMatchScore },
      totalWeightedScore,
      status: "Completed"
    });

    res.status(201).json({
      success: true,
      message: "Application scored and filed successfully!",
      totalScore: totalWeightedScore,
      scorecard: finalScorecard.scores
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET: Get all applications for jobs posted by this startup
export const getStartupApplications = async (req, res) => {
    try {
        const startupId = req.userId;

        // Find all jobs posted by this startup
        const jobs = await Job.find({ employedId: startupId }).select("_id");
        const jobIds = jobs.map(j => j._id);

        const applications = await prisma.application.findMany({
            where: {
                mongoJobId: { in: jobIds.map(id => id.toString()) }
            },
            orderBy: { createdAt: "desc" }
        });

        // Fetch student profiles from MongoDB
        const studentIds = [...new Set(applications.map(a => a.studentId))];
        const students = await User.find({ _id: { $in: studentIds } }).select("name email skills avatar").lean();

        // Fetch job titles
        const jobsData = await Job.find({ _id: { $in: jobIds } }).select("title").lean();

        const enriched = applications.map(app => {
            const student = students.find(s => s._id.toString() === app.studentId);
            const job = jobsData.find(j => j._id.toString() === app.mongoJobId);
            return {
                ...app,
                student,
                jobTitle: job ? job.title : "Unknown Job"
            };
        });

        res.status(200).json({ success: true, data: enriched });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};