import Application from "../models/Application.Model.js";
import Job from "../models/job.Model.js";
import User from "../models/userModel.js";
import Assessment from "../models/Assessment.Model.js";
import { GoogleGenAI } from "@google/genai";

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
    const assessment = await Assessment.findOne({ roleTarget: job.targetRole }).lean();
    let correctCount = 0;
    
    if (assessment) {
      assessment.questions.forEach(q => {
        const studentChoice = studentAnswers.find(ans => ans.questionId === q.questionId);
        if (studentChoice && Number(studentChoice.chosenIndex) === q.correctOptionIndex) {
          correctCount++;
        }
      });
    }
    const assessmentScore = assessment ? Math.round((correctCount / assessment.questions.length) * 100) : 0;

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