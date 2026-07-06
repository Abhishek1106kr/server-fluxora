import Job from "../models/job.Model.js";
import axios from "axios";

// ── POST /api/jobs ─────────────────────────────────────────────────────────────
export const createJob = async (req, res) => {
  try {
    const { title, company, location, jobType, tags, description, applyLink } = req.body;

    // employedId comes from JWT middleware in production; fallback to body for dev
    const employedId = req.user?._id || req.body.employedId;

    if (!title || !company || !description) {
      return res.status(400).json({ success: false, message: "Missing required fields: title, company, description" });
    }

    if (!employedId) {
      return res.status(400).json({ success: false, message: "Employer ID is required" });
    }

    const newJob = await Job.create({
      title,
      company,
      companyLogo: req.body.companyLogo || "",
      location: location || "Remote",
      jobType: jobType || "Full Time",
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      description,
      applyLink: applyLink || "",
      employedId,
    });

    return res.status(201).json({ success: true, message: "Job posted successfully", data: newJob });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ── GET /api/jobs ──────────────────────────────────────────────────────────────
/**
 * Fetch jobs from Remotive — completely free, no API key required.
 * Docs: https://remotive.com/api/remote-jobs
 */
async function fetchExternalJobs() {
  try {
    const res = await axios.get("https://remotive.com/api/remote-jobs", {
      params: { limit: 15 },
      timeout: 7000,
      headers: { Accept: "application/json" },
    });


    const results = res.data?.jobs || [];
    return results.map((job) => ({
      _id: `ext_remotive_${job.id}`,
      title: job.title || "Untitled Role",
      company: job.company_name || "Unknown Company",
      // Remotive provides a direct logo URL per job listing
      companyLogo: job.company_logo || "",
      location: job.candidate_required_location || "Remote",
      jobType: job.job_type === "full_time" ? "Full Time"
             : job.job_type === "part_time" ? "Part Time"
             : job.job_type === "contract"  ? "Contract"
             : "Full Time",
      tags: Array.isArray(job.tags) ? job.tags.slice(0, 6) : [],
      description: job.description
        ? job.description.replace(/<[^>]+>/g, "").slice(0, 500) + "…"
        : "Visit the listing for full details.",
      applyLink: job.url || "https://remotive.com/remote-jobs",
      source: "external_feed",
      createdAt: job.publication_date ? new Date(job.publication_date) : new Date(),
    }));
  } catch (err) {
    console.warn("[jobController] Remotive API unavailable:", err.message);
    return [];
  }
}

export const getDashboardJobs = async (req, res) => {
  try {
    // 1. Local platform jobs (newest first)
    const localJobs = await Job.find().sort({ createdAt: -1 }).lean();

    // 2. External feed (graceful fallback)
    const externalJobs = await fetchExternalJobs();

    // 3. Merge — platform jobs first, then external
    const unifiedJobFeed = [...localJobs, ...externalJobs];

    return res.status(200).json({
      success: true,
      count: unifiedJobFeed.length,
      sources: { platform: localJobs.length, external: externalJobs.length },
      data: unifiedJobFeed,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

//controls the job eligibility criteria 