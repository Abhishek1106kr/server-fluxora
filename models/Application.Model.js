import mongoose from "mongoose";

const applicationSchema=new mongoose.Schema({
    jobId:{type:mongoose.Schema.Types.ObjectId,ref:"Job",required:true},
    studentId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},

    scores:{
        assessmentScore:{type:Number,default:0},
        projectScore:{type:Number,default:0},
        skillsMatchScore:{type:Number,default:0}
    },

    totalWeightScore:{type:Number,
        default:0
    },
    status:{
        type:String,
        enum:["Applied","Assessment_pending","Completed","Shortlisted","Rejected"],
        default:"Assessment_pending"
    }
},{timestamps:true});

applicationSchema.index({jobId:1,studentId:1},{unique:true});

applicationSchema.index({totalWeightScore:-1});

export default mongoose.model("Application", applicationSchema);

