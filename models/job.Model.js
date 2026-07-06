import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Job Title is required"], trim: true },
    company: { type: String, required: [true, "Mentioning Company is Important"], trim: true },
    companyLogo:{type:String,default:""},
    location: { type: String, default: "Remote" },
    jobType: {
      type: String,
      required: true,
      enum: ["Full Time", "Part Time", "Contract", "Temporary", "Internship"],
      default: "Full Time",
    },
    tags: [{ type: String }], // Array of tag strings e.g. ["React", "Node.js"]
    applyLink: { type: String },
    description: { type: String, required: [true, "Job Description is Required"] },
    employedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // Links job to the employer/startup who posted it
    source: { type: String, default: "platform_internal" }, // Identifies platform-posted jobs
  },
  { timestamps: true } // ← lowercase 's' — Mongoose requires this exact casing
);

jobSchema.index({ createdAt: -1 }); // Newest first

const Job = mongoose.model("Job", jobSchema);
export default Job;


//adding some constraints & test refrence links
