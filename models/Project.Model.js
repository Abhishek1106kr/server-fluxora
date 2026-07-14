import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  targetRole: { type: String, required: true }, 
  requiredSkills: [{ type: String, required: true }],
  stipend: { type: String, required: true },
  duration: { type: String, required: true },
  repositoryUrl: { type: String, required: true },
  
  startupId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  
  eligibilityCriteria: {
    minAssessmentScore: { type: Number, default: 70 },
    skillsMatchThreshold: { type: Number, default: 2 }
  }
}, { timestamps: true });

export default mongoose.model("Project", projectSchema);