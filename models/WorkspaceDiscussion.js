import mongoose from "mongoose";

const workspaceDiscussionSchema = new mongoose.Schema(
  {
    projectStateId: {
      type: String,
      required: true,
      index: true,
    },
    author: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      required: true,
    },
    attachments: [
      {
        name: { type: String, required: true },
        size: { type: String, required: true },
        url: { type: String, required: true }
      }
    ],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const WorkspaceDiscussion = mongoose.model("WorkspaceDiscussion", workspaceDiscussionSchema);
export default WorkspaceDiscussion;
