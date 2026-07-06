import mongoose from "mongoose";

const upcomingEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { 
      type: String, 
      enum: ["Hackathon", "Meetup", "Webinar", "Conference"], 
      required: true 
    },
    source: { type: String, default: "platform_curated" }, // Identifies this as your DB entry
    startDate: { type: Date, required: true },
    location: { type: String, default: "Online" }, 
    registrationLink: { type: String, required: true },
    tags: [{ type: String }] // e.g., ["AI/ML", "React", "DevOps"]
  },
  { timestamps: true }
);

// Speeds up sorting events chronologically
upcomingEventSchema.index({ startDate: 1 });

export default mongoose.model("UpcomingEvent", upcomingEventSchema);
