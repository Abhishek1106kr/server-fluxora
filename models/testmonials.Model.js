import mongoose from "mongoose";


const testimonialSchema = new mongoose.Schema(
  {
    feedback: {
      type: String,
      required: [true, "Feedback content is required"],
      trim: true, 
    },
   
    authorName: {
      type: String,
      default: "Anonymous"
    },
    authorRole:{
        type:String,
        trim:true,
        required:true
    },
    companyName: {
      type: String,
      trim: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  { 
    timestamps: true 
  }
);

const Testimonial = mongoose.model("Testimonial", testimonialSchema);
export default Testimonial;