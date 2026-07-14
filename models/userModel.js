import mongoose from "mongoose";

const userSchema=new mongoose.Schema({
    name:{type:String, required:true},
    email:{type:String, unique:true, required:true},
    password:{type:String, required:true},
    username:{type:String,unique:true, sparse:true},
    verifyOTP:{type:String, default:''},
    verifyOTPExprireAT:{type:Number, default:0},
    isVerified:{type:Boolean,default:false},
    isAccountVerified:{type:Boolean,default:false},
    resetOTP:{type:String, default:''},
    resetOTPExpriedAt:{type:Number, default:0},
    role:{type:String, enum:['developer', 'startup', 'admin'], default:'developer'},
    skills:{type:[String], default:[]},
    github:{type:String, default:''},
    rating:{type:Number, default:0},
    ratingCount:{type:Number, default:0},
    avatar:{type:String, default:''},
    companyName:{type:String, default:''},
    companyOverview:{type:String, default:''},
    bio:{type:String, default:''},
    location:{type:String, default:''},
    linkedin:{type:String, default:''},
    motivation:{type:String, default:''},
    resume:{type:String, default:''},
    resumeText:{type:String, default:''},
    aspiration:{type:String, default:''}
})

const userModel=mongoose.models.user||mongoose.model("user",userSchema);
//
export default userModel;