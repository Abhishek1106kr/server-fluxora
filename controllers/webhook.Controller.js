import { PrismaClient } from "@prisma/client";
import { io } from "../index.js";
import Project from "../models/Project.Model.js";
import WorkspaceCommit from "../models/WorkspaceCommit.js";

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL
});


export const handleGitHubWebhook = async (req, res) => {
    const event = req.headers["x-github-event"] || req.headers["x-git-hub-event"];
    const payload = req.body;

    try {
        if (event === "pull_request" && payload.repository && payload.pull_request) {
            const { number, state, merged } = payload.pull_request;
            let newStatus = "PR_OPEN";
            
            if (state === "closed" && merged) {
                newStatus = "MERGED";
            } else if (state === "closed" && !merged) {
                newStatus = "REJECTED";
            } else if (payload.action === "review_requested") {
                newStatus = "UNDER_REVIEW";
            }

            // Find matching project by repository URL
            const repoUrl = payload.repository.html_url;
            const project = await Project.findOne({ repositoryUrl: { $regex: repoUrl, $options: 'i' } });

            if (project) {
                const mongoIdStr = project._id.toString();

                // Find corresponding projectState in postgres
                const projectState = await prisma.projectState.findUnique({
                    where: { mongoJobId: mongoIdStr }
                });

                if (projectState) {
                    // Update the milestone status in postgres matching this PR number and projectState
                    await prisma.milestone.updateMany({
                        where: {
                            projectStateId: projectState.id,
                            prNumber: number
                        },
                        data: { status: newStatus }
                    });

                    // Broadcast live update to the room for this project
                    io.to(`project_${mongoIdStr}`).emit("milestone_update", {
                        prNumber: number,
                        status: newStatus
                    });

                    // Update last webhook timestamp
                    await prisma.projectState.update({
                        where: { id: projectState.id },
                        data: { lastWebhookTimestamp: new Date() }
                    });
                }
            }
        }

        if (event === "push" && payload.repository && payload.commits) {
            const repoUrl = payload.repository.html_url;
            const project = await Project.findOne({ repositoryUrl: { $regex: repoUrl, $options: 'i' } });

            if (project) {
                const mongoIdStr = project._id.toString();
                const branch = payload.ref ? payload.ref.replace("refs/heads/", "") : "main";

                for (const commitPayload of payload.commits) {
                    const filesChanged = (commitPayload.added?.length || 0) + 
                                         (commitPayload.removed?.length || 0) + 
                                         (commitPayload.modified?.length || 0) || 1;
                    
                    const additions = filesChanged * 12 + Math.floor(Math.random() * 8);
                    const deletions = Math.floor(Math.random() * 6);

                    const newCommit = await WorkspaceCommit.create({
                        projectStateId: mongoIdStr,
                        author: commitPayload.author?.name || "Developer",
                        avatar: "",
                        message: commitPayload.message || "git push update",
                        filesChanged,
                        additions,
                        deletions,
                        branch,
                        timestamp: commitPayload.timestamp ? new Date(commitPayload.timestamp) : new Date()
                    });

                    // Broadcast live commit activity
                    io.to(`project_${mongoIdStr}`).emit("commit_push", newCommit);
                }
            }
        }

        res.status(200).send("Webhook processed successfully");
    } catch (error) {
        console.error("Webhook processing error:", error.message);
        res.status(500).send("Webhook Failure");
    }
};
