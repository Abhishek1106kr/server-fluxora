import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: "Anonymous"
    },
    role: {
      type: String,
      required: true,
      trim: true
    },
    avatar: {
      type: String,
      default: ""
    },
    content: {
      type: String,
      required: [true, "Feedback content is required"],
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    featured: {
      type: Boolean,
      default: false
    }
  },
  { 
    timestamps: true 
  }
);

const Testimonial = mongoose.models.Testimonial || mongoose.model("Testimonial", testimonialSchema);
export default Testimonial;