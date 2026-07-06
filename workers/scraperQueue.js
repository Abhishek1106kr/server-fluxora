import {Queue,Worker} from 'bullmq';
import { analyzeResumeAlignment } from '../services/aiServices.js';
import net from 'net';

export const REDIS_CONFIG={
    host:'localhost',
    port:6377,
    maxRetriesPerRequest:null,
};

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

const redisRunning = await isRedisAlive(REDIS_CONFIG.host, REDIS_CONFIG.port);

export let resumeAnalysisQueue = null;
export let analysisWorker = null;

if (redisRunning) {
    console.log("[Queue Initializer] Redis detected on port 6377. Initializing BullMQ...");
    resumeAnalysisQueue = new Queue('resumeAnalysis', { connection: REDIS_CONFIG });

    analysisWorker = new Worker('resumeAnalysis', async (job) => {
        const { resumeText, targetJob, jdText, matchId } = job.data;
        console.log(`[Queue Processing] Executing AI Evaluation for Job Task ID:${job.id}`);
        const evaluationResult = await analyzeResumeAlignment(resumeText, targetJob, jdText);
        console.log("Evaluation Success", evaluationResult);
        console.log("[Queue Success] Analysis generated for task", job.id);
        return evaluationResult;
    }, {
        connection: REDIS_CONFIG,
        concurrency: 2,
    });
} else {
    console.log("[Queue Initializer] Redis not active. BullMQ initialization skipped (using inline fallback).");
}

// Helper functions
export const enqueueResumeAnalysis = async (resumeText, targetJob, jdText, matchId) => {
    if (!resumeAnalysisQueue) {
        throw new Error("Redis Queue is not initialized");
    }
    return await resumeAnalysisQueue.add(
        'resumeAnalysis',
        { resumeText, targetJob, jdText, matchId },
        {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
            removeOnComplete: true,
        }
    );
};
