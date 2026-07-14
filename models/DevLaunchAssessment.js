import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema(
  {
    milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: "DevLaunchMilestone", required: true, unique: true },
    questions: [
      {
        question: { type: String, required: true },
        options: { type: [String], required: true },
        correctIndex: { type: Number, required: true },
      },
    ],
    passingScore: { type: Number, default: 60 },
  },
  { timestamps: true }
);

export default mongoose.models.DevLaunchAssessment || mongoose.model("DevLaunchAssessment", assessmentSchema);
