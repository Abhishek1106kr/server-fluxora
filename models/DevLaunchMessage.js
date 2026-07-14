import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: "DevLaunchMilestone", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    senderName: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.DevLaunchMessage || mongoose.model("DevLaunchMessage", messageSchema);
