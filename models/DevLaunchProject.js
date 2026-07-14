import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    techStack: { type: [String], default: [] },
    estimatedDuration: { type: String },
    startupId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    status: { type: String, enum: ["active", "completed"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.models.DevLaunchProject || mongoose.model("DevLaunchProject", projectSchema);
