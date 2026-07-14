import { analyzeResumeAlignment } from "../services/aiServices.js";
import { calculateFastATS } from "../utils/atsEngine.js";
import { generateContent } from "../services/aiProvider.js";
import Job from "../models/job.Model.js";
import userModel from "../models/userModel.js";
import { generateEmbedding, cosineSimilarity } from "../services/embeddingService.js";

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

        const geminiResponse = await generateContent({
            contents,
            temperature: 0.7
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

/**
 * POST /api/ai/evaluate-project
 * Evaluates candidate project against job criteria and skills.
 */
export const evaluateProject = async (req, res) => {
    try {
        const { jobTitle, requiredSkills = [], studentSkills = [], projectDescription, repositoryUrl } = req.body;

        if (!jobTitle || !projectDescription) {
            return res.status(400).json({ success: false, message: "Job Title and Project Description are required." });
        }

        const systemPrompt = `You are the elite Technical Screening Engine for Fluxora, an AI-native developer marketplace. Your job is to critically evaluate a candidate's custom software project and profile alignment against a specific startup opportunity to generate an automated screening score.

CONTEXT & GOAL:
Startups use your evaluations to immediately filter out underqualified applicants. You must look past superficial buzzwords and grade based on true architectural execution, tech-stack maturity, and role alignment.

INPUT METADATA PROVIDED:
1. Target Job Parameters: ${JSON.stringify({ title: jobTitle, requiredSkills })}
2. Student Profile Technical Skills: ${JSON.stringify(studentSkills)}
3. Student's Self-Nominated Best Project: ${JSON.stringify({ description: projectDescription, repositoryUrl })}

CRITICAL EVALUATION METRICS:
1. Architectural Complexity (0-40 points): Does the project use advanced production concepts (e.g., WebSockets, background queues, indexing, complex database engines)? Deduct points for generic, tutorial-level apps (e.g., basic Todo lists, simple static landing pages).
2. Tech Stack Maturity (0-30 points): Evaluate the depth of technical execution in their project description relative to the target role.
3. Ecosystem Alignment (0-30 points): Assess how seamlessly the student's project skills bridge into the startup's required stack.

RULES FOR JSON OUTPUT:
You must respond strictly in a valid, parsable JSON block matching this schema:
{
  "projectComplexityScore": <integer between 0 and 100>,
  "alignmentDeductions": <integer showing point deductions based on missing stack overlaps>,
  "technicalStrengths": ["list maximum 3 highly specific engineering highlights"],
  "criticalKnowledgeGaps": ["list maximum 3 missing technical concepts or frameworks"]
}

STRICT CONSTRAINTS:
- Be objective and critical. If a project is a basic CRUD app, do not score its complexity above 50.
- Ensure the JSON values are strictly numeric or well-formatted strings.
- Do not output any thinking processes, introductory text, or concluding notes. Output only the pure JSON block.`;

        const geminiResponse = await generateContent({
            contents: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.2
        });

        const resultText = geminiResponse.text?.trim() || "{}";
        const evaluation = JSON.parse(resultText);

        return res.json({
            success: true,
            evaluation
        });

    } catch (error) {
        console.error("[AI Controller] evaluateProject error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Project evaluation failed."
        });
    }
};

/**
 * POST /api/ai/chatbot
 * Site-wide RAG chatbot supporting career guidance, resume ATS matching, and site navigation redirects.
 */
export const handleChatbot = async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        const userId = req.userId;

        if (!message?.trim()) {
            return res.status(400).json({ success: false, message: "Inquiry message is required." });
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized user session." });
        }

        // 1. Fetch user context
        const userProfile = await userModel.findById(userId).lean();
        if (!userProfile) {
            return res.status(404).json({ success: false, message: "User profile not found." });
        }

        // 2. Perform RAG: Vector similarity match to fetch top 3 matching jobs from DB
        let retrievedJobsContext = "";
        try {
            const queryEmbedding = await generateEmbedding(message);
            const allJobs = await Job.find({}).lean();

            const scored = allJobs.map(j => {
                let score = 0;
                if (j.embedding && Array.isArray(j.embedding) && j.embedding.length > 0) {
                    score = cosineSimilarity(queryEmbedding, j.embedding);
                }
                return { ...j, similarity: score };
            });

            scored.sort((a, b) => b.similarity - a.similarity);
            const topJobs = scored.slice(0, 3).filter(j => j.similarity >= 0.15);

            if (topJobs.length > 0) {
                retrievedJobsContext = topJobs.map(job =>
                    `- Job Title: "${job.title}" at "${job.company}". Location: "${job.location}", Type: "${job.jobType}". Description: "${job.description.slice(0, 200)}...". Apply Link: "${job.applyLink || 'N/A'}"`
                ).join("\n");
            }
        } catch (embedErr) {
            console.warn("[Chatbot] RAG vector search failed:", embedErr.message);
        }

        // 3. Assemble profile properties
        const candidateSkills = (userProfile.skills || []).join(", ") || "None specified";
        const candidateBio = userProfile.bio || "No biography provided yet.";
        const candidateResume = userProfile.resumeText || "No resume text uploaded yet.";
        const candidateAspiration = userProfile.aspiration || "None specified";

        const systemInstruction = `
You are Fluxy, the friendly, brilliant, and elite AI Career Assistant for the Fluxora Platform.
Your goal is to guide students on their career journey, help them find jobs, calculate ATS match scores, and navigate the platform.

CANDIDATE PROFILE CONTEXT:
- Name: "${userProfile.name}"
- Bio: "${candidateBio}"
- Skills: [${candidateSkills}]
- Resume Details: "${candidateResume.slice(0, 2000)}"
- Target Career Aspiration: "${candidateAspiration}"

AVAILABLE PLATFORM PAGES (Navigation Links):
- Home / Welcome Portal: "/mainpage"
- Profile, Resume Upload & Skills Settings: "/dashboard"
- Job Board & Open Opportunities: "/job" (where they search jobs and toggle AI Semantic search mode)
- AI Interview Simulator & Practice: "/interviewPreparation"
- AI Resume Optimizer & ATS Checker: "/resumePreparation"
- Startups Partner Directory: "/startups"
- Projects Marketplace & Marketplace: "/devlaunch"
- Collaborations Developer Dashboard: "/devlaunch/dev-dashboard"
- Technical Assessment Portal & Screenings: "/assessment-portal"
- Events, Hackathons & Mixers Portal: "/events"
- Add Platform Testimonial Form: "/add-testimonial"

SEMANTICALLY RETRIEVED JOBS FROM DATABASE (RAG Context):
${retrievedJobsContext || "No specific matches found in the database. Tell the user about other roles or how to search on /job."}

RULES:
1. Be professional, supportive, and clean. Format your responses in markdown (e.g. lists, bold text).
2. If the user asks about jobs, internships, or opportunities, read the RAG Context. Recommend the matching jobs, providing company names, descriptions, and their links.
3. If the user asks for their ATS score or asks how well they match a job:
   - Perform a comparative analysis between the user's Resume Details (under CANDIDATE PROFILE CONTEXT) and the job description they are asking about.
   - Provide an ATS Match Score (0-100), key strengths (1-2 bullet points), and critical gaps/improvements (1-2 bullet points).
4. If the user asks for general resume suggestions or how to improve their ATS score overall:
   - Analyze their Bio, Skills, and Resume Details against their Target Career Aspiration.
   - Provide specific, actionable suggestions of technical tools, libraries, architectures, or frameworks they can learn and add to their resume to boost their score and competitiveness.
5. If the user wants to practice interviews, check their resume, apply to jobs, or modify their profile, explain the workflow and tell them exactly which route to navigate to from the AVAILABLE PLATFORM PAGES list.
6. In addition to your text reply, if the context indicates a specific page transition, set the "navigate" property in the output JSON. For example, if they say "take me to interview practice", return "navigate": "/interviewPreparation". If no navigation is required, set "navigate": null.

OUTPUT FORMAT:
You MUST respond strictly in a valid JSON block matching this schema:
{
  "reply": "Your detailed markdown response here",
  "navigate": "/page_route_or_null"
}
Ensure the output is valid JSON. Do not wrap it in markdown code fences.
`;

        // 4. Call our unified AI provider completions wrapper
        const contents = Array.isArray(history) && history.length > 0
            ? history
            : [{ role: "user", parts: [{ text: message }] }];

        const result = await generateContent({
            contents,
            systemInstruction,
            temperature: 0.3,
            responseMimeType: "application/json"
        });

        const cleanJsonText = result.text?.trim() || "{}";
        const cleaned = cleanJsonText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        const chatbotResponse = JSON.parse(cleaned);

        return res.status(200).json({
            success: true,
            reply: chatbotResponse.reply || "I'm here to help you navigate Fluxora. Ask me anything!",
            navigate: chatbotResponse.navigate || null
        });

    } catch (error) {
        console.error("[AI Chatbot Controller] Error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to process chatbot interaction."
        });
    }
};
