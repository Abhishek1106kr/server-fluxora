import { analyzeResumeAlignment } from "../services/aiServices.js";
import { calculateFastATS } from "../utils/atsEngine.js";

/**
 * POST /api/ai/resume-ats
 * Runs the fast local ATS engine on the user's stored resume text,
 * then sends the full text to Gemini for deep alignment analysis.
 * Requires: injectUserCareerContext middleware to be run first.
 */
export const evaluateResumeATS = async (req, res) => {
    try {
        const { currentResume, dreamJob, name } = req.careerContext;

        if (!currentResume || currentResume === "No resume uploaded yet.") {
            return res.status(400).json({
                success: false,
                message: "No resume text found on your profile. Please upload a resume first."
            });
        }

        const targetJobTitle = dreamJob?.title || "Software Engineer";
        const targetCompany = dreamJob?.targetCompany || "";

        // 1. Fast local ATS pre-scan
        const fastATS = calculateFastATS(currentResume);

        // 2. Deep Gemini AI alignment analysis
        const jdContext = targetCompany
            ? `Target Company: ${targetCompany}. Desired Skills: ${(dreamJob?.desiredSkills || []).join(", ")}`
            : "";

        const deepAnalysis = await analyzeResumeAlignment(currentResume, targetJobTitle, jdContext);

        return res.json({
            success: true,
            candidate: name,
            targetJob: targetJobTitle,
            fastATS: {
                score: fastATS.score,
                suggestions: fastATS.suggestions
            },
            deepAnalysis
        });

    } catch (error) {
        console.error("[AI Controller] evaluateResumeATS error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to evaluate resume."
        });
    }
};

/**
 * POST /api/ai/interview-chat
 * Simulates an interview question based on the user's resume and dream job.
 * Requires: injectUserCareerContext middleware to be run first.
 * Body: { message: string, history: Array<{role, parts}> }
 */
export const simulateInterviewChat = async (req, res) => {
    try {
        const { currentResume, dreamJob, name, careerLevel } = req.careerContext;
        const { message, history = [] } = req.body;

        if (!message?.trim()) {
            return res.status(400).json({ success: false, message: "Message is required." });
        }

        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Build a system-level context string for the interview persona
        const systemContext = `
You are an expert technical interviewer at ${dreamJob?.targetCompany || "a top tech company"}.
You are interviewing ${name} for the role of ${dreamJob?.title || "Software Engineer"}.
Their career level is: ${careerLevel || "Fresher"}.
Their resume summary: ${currentResume?.slice(0, 800) || "Not provided"}.

Rules:
- Ask ONE focused interview question at a time based on the conversation history.
- When the candidate answers, give brief, constructive feedback (1-2 sentences), then ask the next question.
- Stay in character as the interviewer. Be professional but encouraging.
- Start by welcoming the candidate and asking a warm-up question.
`.trim();

        // Prepend system context to first user message if no history
        const contents = [
            ...(history.length === 0
                ? [{ role: "user", parts: [{ text: `[Context for this session - do not repeat this]: ${systemContext}\n\nCandidate: ${message}` }] }]
                : [
                    { role: "user", parts: [{ text: `[Context]: ${systemContext}` }] },
                    { role: "model", parts: [{ text: "Understood. I'll act as the technical interviewer." }] },
                    ...history,
                    { role: "user", parts: [{ text: message }] }
                ]
            )
        ];

        const geminiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: { temperature: 0.7 }
        });

        const reply = geminiResponse.text?.trim() || "I didn't catch that. Could you rephrase?";

        return res.json({
            success: true,
            reply,
            // Return the updated history for the frontend to store
            updatedHistory: [
                ...history,
                { role: "user", parts: [{ text: message }] },
                { role: "model", parts: [{ text: reply }] }
            ]
        });

    } catch (error) {
        console.error("[AI Controller] simulateInterviewChat error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Interview simulation failed."
        });
    }
};
