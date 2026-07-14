import Job from "../models/job.Model.js";
import axios from "axios";
import { generateEmbedding, cosineSimilarity } from "../services/embeddingService.js";

const OPENWEBNINJA_KEY = "ak_wgaissqnn9bhk145mwfdttb18gboca320oiroar6450xfid";

// Helper to save external jobs with embeddings in MongoDB
async function saveExternalJobs(jobs) {
  for (const job of jobs) {
    try {
      // Check if duplicate exists (either applyLink or title + company)
      const existing = await Job.findOne({
        $or: [
          { applyLink: job.applyLink },
          { title: job.title, company: job.company }
        ]
      });

      if (!existing) {
        const textToEmbed = `${job.title} at ${job.company}. ${job.description} Tags: ${(job.tags || []).join(", ")}`;
        let embedding = undefined;
        try {
          embedding = await generateEmbedding(textToEmbed);
        } catch (embedErr) {
          console.warn(`[JobController] Failed to embed synced job "${job.title}":`, embedErr.message);
        }

        await Job.create({
          title: job.title,
          company: job.company,
          companyLogo: job.companyLogo || "",
          location: job.location || "Remote",
          jobType: job.jobType || "Full Time",
          tags: job.tags || [],
          description: job.description,
          applyLink: job.applyLink,
          source: "external_feed",
          embedding,
        });
      }
    } catch (err) {
      console.warn(`[JobController] Error saving external job "${job.title}":`, err.message);
    }
  }
}

// ── POST /api/jobs ─────────────────────────────────────────────────────────────
export const createJob = async (req, res) => {
  try {
    const { title, company, location, jobType, tags, description, applyLink } = req.body;

    // employedId comes from JWT middleware
    const employedId = req.userId || req.user?._id || req.body.employedId;

    if (!title || !company || !description) {
      return res.status(400).json({ success: false, message: "Missing required fields: title, company, description" });
    }

    if (!employedId) {
      return res.status(400).json({ success: false, message: "Employer ID is required" });
    }

    const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);

    // Generate vector embedding for the new job
    let embedding = undefined;
    try {
      const textToEmbed = `${title} at ${company}. ${description} Tags: ${tagsArray.join(", ")}`;
      embedding = await generateEmbedding(textToEmbed);
    } catch (err) {
      console.warn("[JobController] Failed to generate embedding for new job:", err.message);
    }

    const newJob = await Job.create({
      title,
      company,
      companyLogo: req.body.companyLogo || "",
      location: location || "Remote",
      jobType: jobType || "Full Time",
      tags: tagsArray,
      description,
      applyLink: applyLink || "",
      employedId,
      embedding,
    });

    return res.status(201).json({ success: true, message: "Job posted successfully", data: newJob });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Map a free-text jobType string to the closest JSearch employment_type param */
function toJSearchEmploymentType(jobType) {
  if (!jobType || jobType === "all") return null;
  const map = {
    "Full Time": "FULLTIME",
    "Part Time": "PARTTIME",
    "Contract": "CONTRACTOR",
    "Internship": "INTERN",
    "Temporary": "TEMPORARY",
  };
  return map[jobType] || null;
}

/** Normalise a raw JSearch job object into the app's unified job shape */
function normaliseJSearchJob(job) {
  const rawType = (job.job_employment_type || "").toLowerCase().replace(/-/g, "");
  const jobTypeMap = {
    fulltime:    "Full Time",
    parttime:    "Part Time",
    contractor:  "Contract",
    contract:    "Contract",
    intern:      "Internship",
    internship:  "Internship",
    temporary:   "Temporary",
  };
  const jobType = jobTypeMap[rawType] || "Full Time";

  const locationParts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
  const location = job.job_is_remote
    ? "Remote"
    : locationParts.length > 0 ? locationParts.join(", ") : "Remote";

  const tags = [
    ...(job.job_required_skills || []),
    ...(job.job_highlights?.Qualifications?.slice(0, 2) || []),
  ].slice(0, 6);

  return {
    _id: `ext_jsearch_${job.job_id}`,
    title: job.job_title || "Untitled Role",
    company: job.employer_name || "Unknown Company",
    companyLogo: job.employer_logo || "",
    location,
    jobType,
    tags,
    description: (job.job_description || "").replace(/\s+/g, " ").slice(0, 500) + "…",
    applyLink: job.job_apply_link || job.job_google_link || "",
    source: "external_feed",
    createdAt: job.job_posted_at_datetime_utc
      ? new Date(job.job_posted_at_datetime_utc)
      : new Date(),
  };
}

/**
 * Fetch jobs from OpenWebNinja JSearch API.
 */
async function fetchExternalJobs(filters = {}) {
  try {
    const { query = "", jobType = "", location = "" } = filters;

    let searchQuery = query || "developer jobs";
    if (jobType && jobType !== "all") searchQuery += ` ${jobType}`;
    if (location) searchQuery += ` in ${location}`;

    const params = {
      query: searchQuery,
      num_pages: 1,
      page: 1,
    };

    const employmentType = toJSearchEmploymentType(jobType);
    if (employmentType) params.employment_types = employmentType;

    const res = await axios.get("https://api.openwebninja.com/jsearch/search-v2", {
      params,
      timeout: 20000,
      headers: {
        Accept: "application/json",
        "X-API-Key": OPENWEBNINJA_KEY,
      },
    });

    const results = res.data?.data?.jobs || res.data?.data || [];
    return results.map(normaliseJSearchJob);
  } catch (err) {
    console.warn("[jobController] JSearch API unavailable:", err.message);

    // Fallback: try Remotive
    try {
      const fallback = await axios.get("https://remotive.com/api/remote-jobs", {
        params: { limit: 12 },
        timeout: 7000,
        headers: { Accept: "application/json" },
      });
      const jobs = fallback.data?.jobs || [];
      return jobs.map((job) => ({
        _id: `ext_remotive_${job.id}`,
        title: job.title || "Untitled Role",
        company: job.company_name || "Unknown Company",
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
    } catch (fallbackErr) {
      console.warn("[jobController] Remotive fallback also failed:", fallbackErr.message);
      return [];
    }
  }
}

// ── GET /api/jobs ──────────────────────────────────────────────────────────────
export const getDashboardJobs = async (req, res) => {
  try {
    const { query = "", jobType = "all", location = "", source = "all", semantic = "false" } = req.query;

    // Auto-heal: Ensure all jobs in DB have embeddings generated
    const jobsWithoutEmbeddings = await Job.find({ embedding: { $exists: false } });
    if (jobsWithoutEmbeddings.length > 0) {
      console.log(`[JobController] Generating embeddings for ${jobsWithoutEmbeddings.length} legacy/seeded jobs...`);
      for (const j of jobsWithoutEmbeddings) {
        try {
          const textToEmbed = `${j.title} at ${j.company}. ${j.description} Tags: ${(j.tags || []).join(", ")}`;
          j.embedding = await generateEmbedding(textToEmbed);
          await j.save();
        } catch (err) {
          console.warn(`[JobController] Failed to generate embedding for legacy job "${j.title}":`, err.message);
        }
      }
    }

    // 1. Vector Semantic Search Path
    if (semantic === "true" && query.trim()) {
      console.log(`[JobController] Performing semantic vector search for: "${query}"`);
      const queryEmbedding = await generateEmbedding(query);

      // Apply other filters to the DB query
      const dbFilter = {};
      if (jobType && jobType !== "all") dbFilter.jobType = jobType;
      if (location) dbFilter.location = { $regex: location, $options: "i" };
      if (source && source !== "all") dbFilter.source = source;

      const jobs = await Job.find(dbFilter).lean();

      // Score and rank candidates using cosine similarity
      const scoredJobs = jobs.map(job => {
        let score = 0;
        if (job.embedding && Array.isArray(job.embedding) && job.embedding.length > 0) {
          score = cosineSimilarity(queryEmbedding, job.embedding);
        }
        return {
          ...job,
          similarity: parseFloat(score.toFixed(4))
        };
      });

      // Sort by similarity descending
      scoredJobs.sort((a, b) => b.similarity - a.similarity);

      // Filter out low scores (less than 0.1 similarity)
      const results = scoredJobs.filter(j => j.similarity >= 0.1);

      return res.status(200).json({
        success: true,
        count: results.length,
        sources: {
          platform: results.filter(j => j.source === "platform_internal").length,
          external: results.filter(j => j.source === "external_feed").length
        },
        data: results
      });
    }

    // 2. Standard Text Search Path
    const mongoFilter = {};
    if (query) {
      mongoFilter.$or = [
        { title:    { $regex: query, $options: "i" } },
        { company:  { $regex: query, $options: "i" } },
        { location: { $regex: query, $options: "i" } },
        { tags:     { $regex: query, $options: "i" } },
      ];
    }
    if (jobType && jobType !== "all") mongoFilter.jobType = jobType;
    if (location) mongoFilter.location = { $regex: location, $options: "i" };
    if (source && source !== "all") mongoFilter.source = source;

    const localJobs = await Job.find(mongoFilter).sort({ createdAt: -1 }).lean();

    // Fetch and background-sync external feed jobs
    let externalJobs = [];
    if (source === "all" || source === "external_feed") {
      const fetched = await fetchExternalJobs({ query, jobType, location });
      if (fetched.length > 0) {
        saveExternalJobs(fetched).catch(err =>
          console.error("[JobController] Background sync error:", err.message)
        );
      }
      externalJobs = fetched;
    }

    const unifiedJobFeed = source === "platform_internal"
      ? localJobs
      : [...localJobs, ...externalJobs];

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

// GET: Retrieve jobs posted by the logged-in startup
export const getMyPostedJobs = async (req, res) => {
  try {
    const employedId = req.userId;
    const jobs = await Job.find({ employedId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PUT: Update an existing job posting
export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const employedId = req.userId;
    const { title, company, location, jobType, tags, description, applyLink } = req.body;

    const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);

    let embedding = undefined;
    try {
      const textToEmbed = `${title} at ${company}. ${description} Tags: ${tagsArray.join(", ")}`;
      embedding = await generateEmbedding(textToEmbed);
    } catch (err) {
      console.warn("[JobController] Failed to update embedding during job update:", err.message);
    }

    const job = await Job.findOneAndUpdate(
      { _id: id, employedId },
      {
        title,
        company,
        location: location || "Remote",
        jobType: jobType || "Full Time",
        tags: tagsArray,
        description,
        applyLink: applyLink || "",
        embedding
      },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found or unauthorized to update" });
    }

    return res.status(200).json({ success: true, message: "Job updated successfully", data: job });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE: Delete a job posting
export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const employedId = req.userId;

    const job = await Job.findOneAndDelete({ _id: id, employedId });
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found or unauthorized to delete" });
    }

    return res.status(200).json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};