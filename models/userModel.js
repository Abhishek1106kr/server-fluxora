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
    role:{type:String, enum:['developer', 'startup', 'admin'], default:'developer'}
})

const userModel=mongoose.models.user||mongoose.model("user",userSchema);
//
export default userModel;