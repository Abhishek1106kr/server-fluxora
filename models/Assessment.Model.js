import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswerIndex: { type: Number, required: true }, // 0-based index of the correct option
  points: { type: Number, default: 10 }
});

const assessmentTemplateSchema = new mongoose.Schema({
  targetRole: { type: String, required: true, unique: true }, // e.g., "Backend Developer (Node.js)"
  difficulty: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], default: "Intermediate" },
  timeLimitMinutes: { type: Number, default: 15 },
  questions: [questionSchema]
}, { timestamps: true });

export default mongoose.model("AssessmentTemplate", assessmentTemplateSchema);