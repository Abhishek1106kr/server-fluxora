import { generateContent } from "./aiProvider.js";
import dotenv from "dotenv";

dotenv.config();


/**
 * Orchestrates prompt structure and executes the alignment analysis
 * @param {string} resumeText - Raw text extracted from the PDF resume
 * @param {string} targetJob - The user's target job title
 * @param {string} jobDescription - Explicit job posting text if provided
 */

export async function analyzeResumeAlignment(resumeText,targetJob,jobDescription=""){
    try {
        //performing few-shot in-context training examples to align the grading scale

        const examples = `
      TRAINING EXAMPLE 1 (Weak Alignment):
      - Target Job: DevOps Engineer
      - Candidate Resume: Focused primarily on Frontend React development with minimal Docker exposure. No CI/CD.
      - Expected Score Output: 35-45% range. Critical Gaps must list missing Linux administration and CI/CD pipelines.

      TRAINING EXAMPLE 2 (Strong Alignment):
      - Target Job: Full Stack Developer
      - Candidate Resume: Robust experience with Next.js, Node.js, and Express. Includes TypeScript and Docker projects.
      - Expected Score Output: 85-95% range. Gaps should only focus on advanced topics (e.g., microservices or complex optimization).
    `;
    //constucting the strict prompt

    const userPrompt=`
    You are an elite automated Technical recruiter and Applicant Tracking System(ATS) parsing engine.
    Your task is to analyze the provided resume text against the target job role and calculate an objective mathematical alignment score against the target Job profile.
    ${examples}

    CRITICAL SCORING RUBRIC MATRIX:
    - Core Hard Technical Skills Match (Weight: 40%): Presence of exact technologies, languages, and frameworks requested.
      - Professional Experience Depth & Scope (Weight: 40%): Years of active application, complexity of roles, and tool execution.
      - Impact & Quantifiable Metrics (Weight: 20%): Look for clear indicators of business value, performance speedups, or architectural results (e.g., numbers, percentages, dollar values).

      TARGET JOB TITLE:
      ${targetJob}

      JOB DESCRIPTION (if provided):
      ${jobDescription || "No specific job description provided"}

      RESUME TEXT TO ANALYZE:
      ${resumeText}

      strict scoring guidelines:
      -Zero Tolerance for Generic Titles: If the resume lists "Software Engineer" but the target is "Senior MLOps Engineer", do not inflate the score.
      -Contextual Keyword Matching: "React" alone is insufficient for a "Senior React Developer". The context must show architectural ownership.
      -Quantification is Mandatory: A gap in quantified achievements (e.g., "Improved performance by X%") must lower the score.
      CANDIDATE RESUME PROFILE TEXT:
      ---
      ${resumeText}
      ---

      Analyze the text. You must respond with a raw JSON object matching the following structure without any markdown enclosures:
      {
        "overallScore": 82,
        "breakdown": {
          "skillsMatch": 85,
          "experienceDepth": 75,
          "impactMetrics": 90
        },
        "criticalGaps": ["State specific missing hard tech stacks or domain experience"],
        "actionableFixes": ["Provide highly concrete suggestions on how to rephrase or what projects to highlight"]
      }
    `;

    const response = await generateContent({
        contents: userPrompt,
        responseMimeType: "application/json",
        temperature: 0.1
    });
    const rawText = response.text;
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);

        

    } catch (error) {
        console.error("AI Service Orchestrtion Failure: ", error);
        throw new Error("Failed to analyze resume");
    }
}

export async function executeAiScreening(job, student) {
    try {
        const studentSkillsStr = (student.skills || []).join(", ");
        const jobSkillsStr = (job.tags || []).join(", ");

        const systemPrompt = `You are the elite Technical Screening Engine for Fluxora. Grade the candidate's profile, technical skills, and resume details against the requirements of the job posting "${job.title}" at "${job.company}" requiring the stack [${jobSkillsStr}].
        
        Job Description: "${job.description}"
        Candidate Name: "${student.name}"
        Candidate Skills: [${studentSkillsStr}]
        Candidate Resume Details: "${student.resumeText || "No resume uploaded"}"
        
        Compute:
        1. projectComplexityScore (0-100): An overall alignment score of technical skills, experiences, and qualifications. High score if there is direct alignment, low score if major gap.
        2. alignmentDeductions (0-40): Point deductions based on missing tech stack or years of experience.
        3. technicalStrengths (Array of 1 to 3 items): Key strengths detected.
        4. criticalKnowledgeGaps (Array of 1 to 3 items): Technical items missing.

        Output strictly a valid JSON block matching this schema:
        {
          "projectComplexityScore": <integer between 0 and 100>,
          "alignmentDeductions": <integer showing point deductions>,
          "technicalStrengths": ["strength1", "strength2"],
          "criticalKnowledgeGaps": ["gap1", "gap2"]
        }
        Do not output any introductory or concluding text. Output only raw JSON.`;

        const response = await generateContent({
            contents: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.2
        });

        const resultText = response.text?.trim() || "{}";
        const cleaned = resultText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        return JSON.parse(cleaned);

    } catch (error) {
        console.warn("AI Service Screening Execution Failure, falling back to algorithmic matching scorecard: ", error.message);
        
        // Algorithmic match fallback
        const studentSkills = student.skills || [];
        const requiredSkills = job.tags || [];
        const matchingCount = requiredSkills.filter(skill => 
            studentSkills.some(s => s.toLowerCase() === skill.toLowerCase())
        ).length;
        const skillRatio = requiredSkills.length > 0 ? (matchingCount / requiredSkills.length) : 1;

        return {
            projectComplexityScore: Math.round(60 + (skillRatio * 30)),
            alignmentDeductions: Math.round((1 - skillRatio) * 30),
            technicalStrengths: [
                "Strong foundational candidate profile alignment",
                "Demonstrated matching competency in key stack items"
            ],
            criticalKnowledgeGaps: requiredSkills.length > matchingCount
                ? ["Deepen familiarity with: " + requiredSkills.filter(s => !studentSkills.some(x => x.toLowerCase() === s.toLowerCase())).join(", ")]
                : ["Advanced workflow tuning and optimization metrics"]
        };
    }
}
