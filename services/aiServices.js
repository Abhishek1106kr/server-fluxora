import {GoogleGenAI} from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();



const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});

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

    const geminiResponse=await ai.models.generateContent({
        model:'gemini-2.5-flash',
        contents:userPrompt,
        config:{
            responseMimeType:"application/json",
            temperature:0.1
        }
    });
    // In @google/genai v2.x, text is a direct property — not .response.text()
    const rawText = geminiResponse.text;
    // Strip any accidental markdown code fences Gemini might wrap around the JSON
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);

        

    } catch (error) {
        console.error("AI Service Orchestrtion Failure: ", error);
        throw new Error("Failed to analyze resume");
    }
}
