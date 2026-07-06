import express from "express";
import cors from "cors";
import 'dotenv/config';
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import resumeRouter from "./routes/resumeRoutes.js";
import startupRouter from "./routes/startup.Routes.js";
import "./workers/scraperQueue.js";
import multer from "multer";
import path from "path";
import fs from "fs";





import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import userModel from "./models/userModel.js";
import Eventrouter from "./routes/eventRoutes.js";
import jobRouter from "./routes/jobRoutes.js";
import aiRouter from "./routes/aiRoutes.js";

const app=express();

app.use(passport.initialize());

//Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:5000/api/auth/google/callback',
    passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            const name = profile.displayName || profile.username || "Google User";
            if (!email) {
                return done(new Error("Email not provided by Google"), false);
            }

            let user = await userModel.findOne({ email });
            if (!user) {
                const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
                const hashedPassword = await bcrypt.hash(randomPassword, 10);
                user = new userModel({
                    name,
                    email,
                    password: hashedPassword,
                    isAccountVerified: true
                });
                await user.save();
            }
            return done(null, user);
        } catch (error) {
            return done(error, false);
        }
    }
));

//Github Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.AUTH_GITHUB_CLIENT_ID,
    clientSecret: process.env.AUTH_GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/api/auth/github/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
        const name = profile.displayName || profile.username || "GitHub User";

        let user = await userModel.findOne({ email });
        if (!user) {
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            user = new userModel({
                name,
                email,
                password: hashedPassword,
                isAccountVerified: true
            });
            await user.save();
        }
        return done(null, user);
    } catch (error) {
        return done(error, false);
    }
  }
));


const PORT=process.env.PORT||5000;
connectDB();
app.use(express.json());
app.use(cookieParser());
app.use(cors({origin: ['http://localhost:5173', 'http://localhost:5174'], credentials:true}));
// Ensure uploads folder exists
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Config Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

app.use('/uploads', express.static('uploads'));

app.post("/upload", upload.single("file"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        return res.json({ 
            success: true, 
            message: "File uploaded successfully!", 
            fileUrl 
        });
    } catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

//API endpoints 

app.get('/', (req, res) => {
        res.send("API |Fluxora backend working")
})
app.use('/api/auth',authRouter);
app.use('/api/user',userRouter);
app.use('/api/resume',resumeRouter);
app.use('/api/startup',startupRouter);
app.use('/api/events',Eventrouter);
app.use('/api/jobs',jobRouter);
app.use('/api/ai', aiRouter);

// Error handling middleware to catch JSON syntax/parsing errors (like empty bodies with JSON headers)
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ success: false, message: "Invalid JSON format or empty request body" });
    }
    next(err);
});








app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`)
})




















