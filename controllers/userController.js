import userModel from "../models/userModel.js";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

global.DOMMatrix = global.DOMMatrix || class DOMMatrix {};

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

export const getUserData=async(req,res)=>{
    const userId = req.userId || (req.body && req.body.userId);
    try {
        const user=await userModel.findById(userId);
        if(!user){
            return res.json({success:false,message:"Invalid User"});
        }
        res.json({
            success:true,
            user:{
                name:user.name,
                email:user.email,
                username:user.username,
                _id:user._id,
                isAccountVerified:user.isAccountVerified,//true or false
                role:user.role,
                skills:user.skills,
                github:user.github,
                rating:user.rating,
                ratingCount:user.ratingCount,
                avatar:user.avatar,
                companyName:user.companyName,
                companyOverview:user.companyOverview,
                bio:user.bio,
                location:user.location,
                linkedin:user.linkedin,
                motivation:user.motivation,
                resume:user.resume,
                aspiration:user.aspiration
            }
        })

        
    } catch (error) {
        return res.json({success:false, message:error.message});
    }
};

// PUT: Update student profile details in MongoDB
export const updateUserProfile = async (req, res) => {
    const userId = req.userId;
    const { name, bio, location, github, linkedin, skills, motivation, avatar, resume, aspiration } = req.body;
    try {
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (name !== undefined) user.name = name;
        if (bio !== undefined) user.bio = bio;
        if (location !== undefined) user.location = location;
        if (github !== undefined) user.github = github;
        if (linkedin !== undefined) user.linkedin = linkedin;
        if (skills !== undefined) user.skills = skills;
        if (motivation !== undefined) user.motivation = motivation;
        if (avatar !== undefined) user.avatar = avatar;
        
        // Auto-parse PDF to update resumeText when resume is linked
        if (resume !== undefined) {
            user.resume = resume;
            if (resume && resume.trim().length > 0) {
                try {
                    const filename = path.basename(resume);
                    const filePath = path.join(process.cwd(), "uploads", filename);
                    if (fs.existsSync(filePath)) {
                        console.log(`[UserController] Auto-parsing PDF resume: ${filePath}`);
                        const dataBuffer = await fs.promises.readFile(filePath);
                        const parsed = await pdf(dataBuffer);
                        user.resumeText = parsed.text || "";
                        console.log("[UserController] Successfully updated resumeText.");
                    }
                } catch (parseErr) {
                    console.error("[UserController] Failed to auto-parse PDF:", parseErr.message);
                }
            } else {
                user.resumeText = "";
            }
        }
        if (aspiration !== undefined) user.aspiration = aspiration;

        await user.save();

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: {
                name: user.name,
                email: user.email,
                username: user.username,
                _id: user._id,
                role: user.role,
                skills: user.skills,
                github: user.github,
                avatar: user.avatar,
                bio: user.bio,
                location: user.location,
                linkedin: user.linkedin,
                motivation: user.motivation,
                resume: user.resume,
                aspiration: user.aspiration
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
