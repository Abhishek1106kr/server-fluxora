import mongoose from "mongoose";

const workspaceCommitSchema = new mongoose.Schema(
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
    avatar: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      required: true,
    },
    filesChanged: {
      type: Number,
      default: 0,
    },
    additions: {
      type: Number,
      default: 0,
    },
    deletions: {
      type: Number,
      default: 0,
    },
    branch: {
      type: String,
      default: "main",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const WorkspaceCommit = mongoose.model("WorkspaceCommit", workspaceCommitSchema);
export default WorkspaceCommit;
