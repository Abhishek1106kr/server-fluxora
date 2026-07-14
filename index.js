import express from "express";
import cors from "cors";//for server
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
import morgan from "morgan";





import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import userModel from "./models/userModel.js";
import Eventrouter from "./routes/eventRoutes.js";
import jobRouter from "./routes/jobRoutes.js";
import aiRouter from "./routes/aiRoutes.js";
import devlaunchRouter from "./routes/devlaunchRoutes.js";
import http from "http";
import { Server } from "socket.io";
import DevLaunchMessage from "./models/DevLaunchMessage.js";
import Job from "./models/job.Model.js";
import Application from "./models/Application.Model.js";
import userAuth from "./middleware/userAuth.js";
import testmonialRouter from "./routes/testimonials.Routes.js";
import projectCardRouter from "./routes/ProjectCard.Routes.js";
import applicationRouter from "./routes/applicationRoutes.js";
import { handleGitHubWebhook } from "./controllers/webhook.Controller.js";

const app=express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://client-fluxora.vercel.app'],
    credentials: true
  }
});

io.on("connection", (socket) => {
  socket.on("join_room", (room) => {
    socket.join(room);
  });
  
  socket.on("send_message", async (data) => {
    try {
      const newMsg = new DevLaunchMessage({
        milestoneId: data.milestoneId,
        senderId: data.senderId,
        senderName: data.senderName,
        text: data.text
      });
      await newMsg.save();
      io.to(data.milestoneId).emit("receive_message", newMsg);
    } catch (err) {
      console.error("Socket error saving message:", err.message);
    }
  });
});

app.use(passport.initialize());

//Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5002'}/api/auth/google/callback`,
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
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5002'}/api/auth/github/callback`
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
app.use(cors({origin: ['http://localhost:5173', 'http://localhost:5174', 'https://client-fluxora.vercel.app'], credentials:true})
);
app.use(morgan("dev"));

app.use((req,res,next)=>{
    console.log(`\n============== [INBOUND REQUEST] ==============`);
  console.log(`Time:   ${new Date().toISOString()}`);
  console.log(`Method: ${req.method}`);
  console.log(`URL:    ${req.originalUrl}`);
  console.log(`Body:   ${JSON.stringify(req.body, null, 2)}`);
  console.log(`===============================================`);
  next();
})
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Fluxora Backend Engine Active",
    diagnostics: {
      status: "Healthy",
      uptime: `${Math.round(process.uptime())} seconds`,
      timestamp: new Date(),
      environment: process.env.NODE_ENV || "development"
    }
  });
});
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
app.use('/api/devlaunch', devlaunchRouter);
app.use("/api/testimonials",testmonialRouter);
app.use("/api/projectcard", projectCardRouter);
app.use("/api/applications", applicationRouter);
app.post("/api/webhook/github", handleGitHubWebhook);



app.get('/api/opportunities', async (req, res) => {
  try {
    const jobs = await Job.find({ source: "platform_internal" }).lean();
    const opportunities = jobs.map((job) => ({
      _id: job._id,
      title: job.title,
      company: job.company,
      logo: job.companyLogo || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60",
      location: job.location || "Remote",
      duration: job.jobType === "Internship" ? "3 Months" : "Flexible",
      type: job.jobType === "Internship" ? "Internship" : job.jobType === "Part Time" ? "Part-time" : "Project",
      description: job.description,
      skills: job.tags || [],
      salary: job.jobType === "Internship" ? "$25-30/hr" : "$2500 fixed",
      isFeatured: Math.random() > 0.5,
    }));
    return res.json(opportunities);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/opportunities/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) {
      return res.status(404).json({ error: "Opportunity not found" });
    }
    const opportunity = {
      _id: job._id,
      title: job.title,
      company: job.company,
      logo: job.companyLogo || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60",
      location: job.location || "Remote",
      duration: job.jobType === "Internship" ? "3 Months" : "Flexible",
      type: job.jobType === "Internship" ? "Internship" : job.jobType === "Part Time" ? "Part-time" : "Project",
      description: job.description,
      skills: job.tags || [],
      salary: job.jobType === "Internship" ? "$25-30/hr" : "$2500 fixed",
      isFeatured: Math.random() > 0.5,
    };
    return res.json(opportunity);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/apply', userAuth, async (req, res) => {
  try {
    const { opportunityId } = req.body;
    const existing = await Application.findOne({ jobId: opportunityId, studentId: req.userId });
    if (existing) {
      return res.status(400).json({ error: "Already applied" });
    }
    const appRecord = new Application({
      jobId: opportunityId,
      studentId: req.userId,
    });
    await appRecord.save();
    return res.json({ success: true, message: "Applied successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/event-register', userAuth, async (req, res) => {
  try {
    const { eventId } = req.body;
    console.log(`User ${req.userId} registered for event ${eventId}`);
    return res.json({ success: true, message: "Registered successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Error handling middleware to catch JSON syntax/parsing errors (like empty bodies with JSON headers)
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ success: false, message: "Invalid JSON format or empty request body" });
    }
    next(err);
});








server.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`)
})




















