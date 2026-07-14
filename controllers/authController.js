import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import transporter from "../config/NodeMailer.js";

export const register=async(req,res)=>{
    const {name, email, password, role = 'developer'}=req.body || {};
    if(!name||!email||!password){
        return res.json({success:false, message:"fill all the fields ."})
    }
    try {
        const existingUser=await userModel.findOne({email});
        if(existingUser){
            return res.json({success:false, message:"user already exists"})
        }

        const hashedPassword=await bcrypt.hash(password,10);

        const user =new userModel({
            name, 
            email,
            password:hashedPassword,
            role
        })
 
        await user.save();
        
        //generate token
        const token=jwt.sign({id:user._id},process.env.JWT_SECRET, {expiresIn: '7d'});

        res.cookie('token',token,{
            maxAge:7*24*60*60*1000,
            httpOnly:true,
            secure:process.env.NODE_ENV==='production',
            sameSite:process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        });
        const mailOptions={
            from:process.env.SENDER_MAIL,
            to:email,
            subject:"Welcome to Fluxora",
            text:"Thank you for registering with Fluxora. You can now login to your account.",
            html:`<p>Thank you for registering with <b>Fluxora</b>. You can now login to your account.</p>`,
        }
        try {
            await transporter.sendMail(mailOptions);
        } catch (mailError) {
            console.log("Error sending welcome email:", mailError);
        }
        
        return res.json({success:true,message:"Registration completed ,Login now"})

    }
    catch(error){
        console.log(error);
        return res.json({success:false, message:error.message});
    }
}

export const login=async(req,res)=>{
    const{email,password}=req.body || {};
    if(!email||!password){
        return res.json({success:false, message:"fill all the fields "})
    }
    try {
        const user=await userModel.findOne({email});
        if(!user){
         return res.json({success:false, message:'user does not exist'});
        }

        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.json({success:false, message:'invalid credentials'});
        }   
        
        const token=jwt.sign({id:user._id},process.env.JWT_SECRET, {expiresIn: '7d'});//creation of the token 

        res.cookie('token',token,{
            maxAge:7*24*60*60*1000,
            httpOnly:true,
            secure:process.env.NODE_ENV==='production',
            sameSite:process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        });
        
        return res.json({success:true,message:"Login successfully",token})

    } catch (error) {
        console.log(error);
        return res.json({success:false, message:error.message});
    }
}

export const logout=async(req,res)=>{
    try {
        res.clearCookie('token', {
            httpOnly:true,
            secure:process.env.NODE_ENV==='production',
            sameSite:process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge:7*24*60*60*1000,
        });
        return res.json({success:true,message:"Logout successfully"});
    } catch (error) {
        console.log(error);
        return res.json({success:false,message:"Error during logout"})
    }
}   


//otp verification

export const sendVerifyOtp=async(req,res)=>{
    try {
        const {userId}=req.body;
        const user=await userModel.findById(userId);
        if(!user){
            return res.json({success:false, message:"User not found"});
        }
        if(user.isAccountVerified){
            return res.json({success:false, message:"You are already verified"});
        }
        const otp=String(Math.floor(100000+Math.random()*900000));
        user.verifyOTP=otp;
        user.verifyOTPExprireAT=Date.now()+600000;
        await user.save();

        const mailOptions={
            from:process.env.SENDER_MAIL,
            to:user.email,
            subject:"Verify your email",
            text:`Your OTP is ${otp}`,
            html:`<p>Your OTP is <b>${otp}</b></p>`,
        }
        await transporter.sendMail(mailOptions);
        return res.json({success:true,message:"OTP sent successfully"});

   } catch (error) {
        return res.json(   {success:false, message:error.message});
    }
}

//verify Email

export const verifyEmail=async(req,res)=>{
    const{userId,otp}=req.body;
    if(!userId||!otp){
        return res.json({success:false,message:"fill all the fields"});
    }
    try {
        const user=await userModel.findById(userId);
        if(!user){
            return res.json({success:false,message:"user not found"});
        }
        if(user.isAccountVerified){
            return res.json({success:false, message:"Account already verified"});
        }
        if(user.verifyOTP === '' || user.verifyOTP!==String(otp)){
            return res.json({success:false,message:"invalid otp"});
        }
        if(user.verifyOTPExprireAT<Date.now()){
            return res.json({success:false,message:"otp expired"});
        }

        user.isAccountVerified=true;
        user.verifyOTP='';
        user.verifyOTPExprireAT=0;
        await user.save();
        return res.json({success:true,message:"email verified successfully"});
    } catch (error) {
        console.log(error);
        return res.json({success:false,message:error.message});
    }
}

//check for the user logged in or not

export const isAuthenticated=async(req,res)=>{
try {
    return res.json({success:true,user:true})
} catch (error) {
    return res.json({success:false,user:false})
}
}

//sending resend otp

export const sendResetOtp=async(req,res)=>{
    const {email}=req.body || {};
    if(!email){
        return res.json({success:false, message:"Email not found"})
    }
    try {
        const user=await userModel.findOne({email});
        if(!user){
            return res.json({success:false, message:"User not found"});
        }

      
        const otp=String(Math.floor(100000+Math.random()*900000));
        user.resetOTP=otp;
        user.resetOTPExpriedAt=Date.now()+600000;
        await user.save();
 
        const mailOptions={
            from:process.env.SENDER_MAIL,
            to:user.email,
            subject:"Reset your password",
            text:`Reset your password using this OTP: ${otp}`,
            html:`<p>Reset your password using this OTP: <b>${otp}</b></p>`,
        };
        await transporter.sendMail(mailOptions);
        return res.json({success:true,message:"OTP sent successfully"});

   } catch (error) {
        return res.json(   {success:false, message:error.message});
    }
}   

//reset password;


export const resetPassword=async(req,res)=>{
   const {email, otp,newPassword}=req.body || {};
   if(!email||!otp||!newPassword){
    return res.json({success:false,message:"fill all the fields"});
   }
   try {
    const user=await userModel.findOne({email});
    if(!user){
        return res.json({success:false,message:"user not found"})
    }
    if(user.resetOTP==="" || user.resetOTP!==String(otp)){
        return res.json({success:false, message:"Invalid Otp"});
    }
    if(user.resetOTPExpriedAt<Date.now()){
        return res.json({success:false, message:"Otp expired"});
    }
    const hashedPassword=await bcrypt.hash(newPassword,10);
    user.password=hashedPassword;
    user.resetOTP="";
    user.resetOTPExpriedAt=0;
    await user.save();
    return res.json({success:true,message:"password reset successfully"})
   } catch (error) {
    console.log(error);
    return res.json({success:false, message:error.message});
   }
}
