import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "DevLaunchProject", required: true },
    startupId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    title: { type: String, required: true },
    description: { type: String },
    techStack: { type: [String], default: [] },
    difficulty: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "intermediate" },
    duration: { type: String },
    requiredScore: { type: Number, default: 0 },
    deadline: { type: Date },
    assignedDeveloper: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    status: { type: String, enum: ["open", "in_progress", "review", "completed"], default: "open" },
    kanban: { type: [String], default: [] },
    rating: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.models.DevLaunchMilestone || mongoose.model("DevLaunchMilestone", milestoneSchema);
