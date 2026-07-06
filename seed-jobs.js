/**
 * seed-jobs.js — Populate the Job collection with platform jobs for dev/demo
 * Usage: node seed-jobs.js
 *
 * Requires a user already in the DB to act as employedId.
 * If no users exist yet, it creates a placeholder employer.
 */
import "dotenv/config";
import mongoose from "mongoose";
import Job from "./models/job.Model.js";
import userModel from "./models/userModel.js";

const PLATFORM_JOBS = [
  {
    title: "Full Stack Engineer (React + Node)",
    company: "Fluxora",
    companyLogo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60",
    location: "Remote — India",
    jobType: "Full Time",
    tags: ["React", "Node.js", "MongoDB", "TypeScript"],
    description:
      "Build and maintain core platform features for Fluxora's developer marketplace. Work across the full stack with React, Node.js, and MongoDB in a fast-moving startup environment.",
    applyLink: "https://fluxora.io/careers",
  },
  {
    title: "Frontend Developer — UI/UX Focused",
    company: "DevLaunch India",
    companyLogo: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&auto=format&fit=crop&q=60",
    location: "Bengaluru, India",
    jobType: "Full Time",
    tags: ["React", "Tailwind CSS", "Figma", "JavaScript"],
    description:
      "Design and implement beautiful, responsive interfaces for DevLaunch's project marketplace. Strong sense of design and attention to pixel-perfect detail required.",
    applyLink: "https://devlaunch.io/jobs",
  },
  {
    title: "Backend Intern — Node.js & MongoDB",
    company: "StartupHub",
    companyLogo: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=100&auto=format&fit=crop&q=60",
    location: "Online",
    jobType: "Internship",
    tags: ["Node.js", "Express", "MongoDB", "REST API"],
    description:
      "Join StartupHub's backend team for a 3-month paid internship. Learn real-world API design, authentication, and database modelling under senior engineers.",
    applyLink: "https://fluxora.io/devlaunch",
  },
  {
    title: "AI/ML Engineer — Gemini Integration",
    company: "Fluxora AI Lab",
    companyLogo: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=100&auto=format&fit=crop&q=60",
    location: "Remote — Worldwide",
    jobType: "Contract",
    tags: ["Python", "Gemini API", "LangChain", "Machine Learning"],
    description:
      "Lead integration of Google Gemini into Fluxora's resume analyser and career tools. Contract role with potential to go permanent.",
    applyLink: "https://fluxora.io/careers/ai",
  },
  {
    title: "DevOps Engineer — CI/CD & Cloud",
    company: "CloudBase Labs",
    companyLogo: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=100&auto=format&fit=crop&q=60",
    location: "Mumbai, India",
    jobType: "Full Time",
    tags: ["Docker", "AWS", "GitHub Actions", "Linux"],
    description:
      "Manage and scale cloud infrastructure for a fast-growing SaaS product. Set up robust CI/CD pipelines and ensure 99.9% uptime.",
    applyLink: "https://cloudbase.io/jobs",
  },
  {
    title: "Mobile Developer — React Native",
    company: "Kode Startup",
    companyLogo: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=100&auto=format&fit=crop&q=60",
    location: "Hyderabad, India",
    jobType: "Part Time",
    tags: ["React Native", "iOS", "Android", "Firebase"],
    description:
      "Build and publish the iOS and Android version of our developer community app. Flexible part-time hours — great for freelancers.",
    applyLink: "https://fluxora.io/opportunities",
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB");

    // Find or create a placeholder employer
    let employer = await userModel.findOne({});
    if (!employer) {
      console.log("⚠️  No users found. Create a user first and re-run this seed.");
      process.exit(1);
    }

    // Clean out previous platform internal jobs to reload them with logos
    await Job.deleteMany({ source: "platform_internal" });
    console.log("🧹 Cleared old platform jobs");

    const jobsWithEmployer = PLATFORM_JOBS.map((j) => ({
      ...j,
      source: "platform_internal",
      employedId: employer._id,
    }));

    const inserted = await Job.insertMany(jobsWithEmployer);
    console.log(`✅ Seeded ${inserted.length} platform jobs with company logos`);
    inserted.forEach((j) => console.log(`   → [${j.jobType}] ${j.title} @ ${j.company}`));
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected. Done.");
    process.exit(0);
  }
}

seed();
