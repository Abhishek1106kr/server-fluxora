import "dotenv/config";
import mongoose from "mongoose";
import Project from "./models/Project.Model.js";
import ProjectState from "./models/ProjectState.Model.js";
import userModel from "./models/userModel.js";

const DUMMY_PROJECTS = [
  {
    title: "E-Commerce Microservices Architecture",
    description: "Migrate an existing monolithic storefront to a highly scalable Dockerized microservices stack using Kubernetes, Redis for caching, and RabbitMQ for message brokers.",
    targetRole: "DevOps Engineer",
    requiredSkills: ["Docker", "Kubernetes", "Redis", "RabbitMQ"],
    stipend: "$1500 / Month",
    duration: "8 Weeks",
    repositoryUrl: "https://github.com/fluxora/ecommerce-microservices",
    eligibilityCriteria: {
      minAssessmentScore: 70,
      skillsMatchThreshold: 2
    },
    status: "DISCOVERY"
  },
  {
    title: "Real-Time Workspace Chat Application",
    description: "Create a full-stack real-time workspace collaboration application featuring multiple channels, private messages, user presence status, and file sharing using Socket.io and Redis.",
    targetRole: "Full Stack Developer",
    requiredSkills: ["React", "Node.js", "WebSockets", "MongoDB"],
    stipend: "$1200 / Month",
    duration: "6 Weeks",
    repositoryUrl: "https://github.com/fluxora/chat-app",
    eligibilityCriteria: {
      minAssessmentScore: 75,
      skillsMatchThreshold: 2
    },
    status: "ACTIVE_WORK",
    studentId: "6472f1ab142345e698889988"
  },
  {
    title: "AI-Powered Technical Resume Reviewer",
    description: "Implement an interactive, AI-driven platform that automatically parses developer resumes, scores them against target jobs, and offers tailored suggestions using the Gemini API.",
    targetRole: "AI / Python Engineer",
    requiredSkills: ["Python", "Gemini API", "Next.js", "Tailwind CSS"],
    stipend: "$2000 / Month",
    duration: "10 Weeks",
    repositoryUrl: "https://github.com/fluxora/ai-resume-optimizer",
    eligibilityCriteria: {
      minAssessmentScore: 80,
      skillsMatchThreshold: 3
    },
    status: "COMPLETED",
    studentId: "6472f1ab142345e698889999"
  }
];

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB");

    // Find or create a placeholder user to own the projects
    let employer = await userModel.findOne({ role: "startup" });
    if (!employer) {
      employer = await userModel.findOne({});
    }
    if (!employer) {
      console.log("⚠️ No users found in DB. Creating a placeholder startup user...");
      employer = await userModel.create({
        name: "Acme Startup Labs",
        email: "startup@acme.com",
        password: "securepassword123",
        role: "startup",
        isAccountVerified: true,
        companyName: "Acme Labs",
        companyOverview: "Building tomorrow's developer ecosystems."
      });
      console.log("✅ Created startup user:", employer.email);
    }

    // Clear old projects and states
    await Project.deleteMany({});
    await ProjectState.deleteMany({});
    console.log("🧹 Cleared existing Projects and ProjectStates");

    for (const dp of DUMMY_PROJECTS) {
      const newProj = await Project.create({
        title: dp.title,
        description: dp.description,
        targetRole: dp.targetRole,
        requiredSkills: dp.requiredSkills,
        stipend: dp.stipend,
        duration: dp.duration,
        repositoryUrl: dp.repositoryUrl,
        eligibilityCriteria: dp.eligibilityCriteria,
        startupId: employer._id
      });

      await ProjectState.create({
        mongoJobId: newProj._id.toString(),
        studentId: dp.studentId || null,
        lifecycleStatus: dp.status,
        currentMilestone: dp.status === "ACTIVE_WORK" ? 1 : dp.status === "COMPLETED" ? 3 : 0
      });

      console.log(`✅ Seeded Project: "${dp.title}" with State: ${dp.status}`);
    }

    console.log("🎉 Seeding completed successfully!");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected. Done.");
    process.exit(0);
  }
}

seed();
