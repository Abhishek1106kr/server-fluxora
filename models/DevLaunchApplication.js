import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: "DevLaunchMilestone", required: true },
    developerId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    assessmentScore: { type: Number, default: null },
    assessmentPassed: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.models.DevLaunchApplication || mongoose.model("DevLaunchApplication", applicationSchema);
