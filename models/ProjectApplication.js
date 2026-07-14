import mongoose from "mongoose";

const projectApplicationSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  assessmentScore: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["pending", "applied", "accepted", "rejected"],
    default: "pending"
  },
  technicalStrengths: [{ type: String }],
  criticalKnowledgeGaps: [{ type: String }],
  submittedAnswers: {
    studentSkills: { type: String },
    projectDescription: { type: String },
    repositoryUrl: { type: String }
  }
}, { timestamps: true });

projectApplicationSchema.index({ projectId: 1, studentId: 1 }, { unique: true });

const ProjectApplication = mongoose.models.ProjectApplication || mongoose.model("ProjectApplication", projectApplicationSchema);

export default ProjectApplication;
