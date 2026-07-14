import mongoose from "mongoose";

const projectStateSchema = new mongoose.Schema(
  {
    mongoJobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    studentId: {
      type: String,
      default: null,
    },
    lifecycleStatus: {
      type: String,
      enum: ["DISCOVERY", "SCREENING", "ACTIVE_WORK", "COMPLETED", "ABANDONED"],
      default: "DISCOVERY",
      index: true,
    },
    currentMilestone: {
      type: Number,
      default: 0,
    },
    lastWebhookTimestamp: {
      type: Date,
      default: null,
    },
    milestones: [
      {
        title: { type: String, required: true },
        description: { type: String, required: true },
        prNumber: { type: Number, default: null },
        status: {
          type: String,
          enum: ["PENDING", "PR_OPEN", "UNDER_REVIEW", "MERGED", "REJECTED"],
          default: "PENDING",
        },
        feedback: { type: String, default: null },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      }
    ]
  },
  { timestamps: true }
);

const ProjectState = mongoose.model("ProjectState", projectStateSchema);
export default ProjectState;