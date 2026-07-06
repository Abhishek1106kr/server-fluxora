import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import net from 'net';

global.DOMMatrix = global.DOMMatrix || class DOMMatrix {};
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import { QueueEvents } from 'bullmq';
import { cleanExtractJobDescription } from '../workers/jobScraper.js';
import { enqueueResumeAnalysis, REDIS_CONFIG } from '../workers/scraperQueue.js';
import { analyzeResumeAlignment } from '../services/aiServices.js';

// Helper to quickly check if Redis is listening on the configured host/port
function isRedisAlive(host, port, timeout = 1000) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let resolved = false;

        socket.setTimeout(timeout);

        const done = (result) => {
            if (!resolved) {
                resolved = true;
                resolve(result);
            }
            socket.destroy();
        };

        socket.on('connect', () => done(true));
        socket.on('timeout', () => done(false));
        socket.on('error', () => done(false));

        socket.connect(port, host);
    });
}

export const optimizeResume = async (req, res) => {
    const { resumeUrl, targetJob, jobDescriptionText, jobDescriptionUrl } = req.body || {};

    if (!resumeUrl) {
        return res.status(400).json({ success: false, message: "Resume file is required" });
    }
    if (!targetJob) {
        return res.status(400).json({ success: false, message: "Target job title is required" });
    }

    try {
        // 1. Map resume URL to local upload path
        let filename;
        try {
            filename = path.basename(resumeUrl);
        } catch (e) {
            return res.status(400).json({ success: false, message: "Invalid resume file link format" });
        }

        const filePath = path.join(process.cwd(), 'uploads', filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "Resume file not found on server" });
        }

        // 2. Parse PDF content
        console.log(`[Resume Optimization] Parsing PDF: ${filePath}`);
        const dataBuffer = await fs.promises.readFile(filePath);
        const parser = new pdf.PDFParse({ data: dataBuffer });
        const parsedPdf = await parser.getText();
        const resumeText = parsedPdf.text;

        if (!resumeText || resumeText.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Could not extract text from the provided resume PDF" });
        }

        // 3. Resolve target Job Description
        let jdText = jobDescriptionText || "";
        if (jobDescriptionUrl) {
            console.log(`[Resume Optimization] Scraping job description from URL: ${jobDescriptionUrl}`);
            const scrapedText = await cleanExtractJobDescription(jobDescriptionUrl);
            if (scrapedText) {
                jdText = scrapedText;
            } else {
                console.warn("[Resume Optimization] Scraping returned empty or failed. Falling back to text prompt.");
            }
        }

        // 4. Run alignment analysis (Queue with inline fallback)
        let evaluationResult;
        const redisHost = REDIS_CONFIG?.host || 'localhost';
        const redisPort = REDIS_CONFIG?.port || 6377;

        const redisRunning = await isRedisAlive(redisHost, redisPort);

        if (redisRunning) {
            console.log("[Resume Optimization] Redis is running. Enqueueing analysis task...");
            try {
                const job = await enqueueResumeAnalysis(resumeText, targetJob, jdText, Date.now().toString());
                const queueEvents = new QueueEvents('resumeAnalysis', { connection: REDIS_CONFIG });
                evaluationResult = await job.waitUntilFinished(queueEvents);
            } catch (queueError) {
                console.error("[Resume Optimization] Queue processing failed. Falling back to inline execution:", queueError);
                evaluationResult = await analyzeResumeAlignment(resumeText, targetJob, jdText);
            }
        } else {
            console.log("[Resume Optimization] Redis is not active. Executing analysis inline...");
            evaluationResult = await analyzeResumeAlignment(resumeText, targetJob, jdText);
        }

        return res.json({
            success: true,
            message: "Resume analysis generated successfully",
            data: evaluationResult
        });

    } catch (error) {
        console.error("Resume optimization error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to analyze resume" });
    }
};
