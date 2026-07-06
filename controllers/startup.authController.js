




import mongoose from "mongoose";
import axios from "axios";
import { externalCache } from "./startupController.js";
import StartUpRegModel from "../models/StartupRegs.Model.js";
import userModel from "../models/userModel.js";

export const registerStartup = async (req, res) => {
    try {
        // req.body.userId is injected by the userAuth middleware
        const {
            userId,
            StartUpName,
            legalName,
            WebSiteUrl,
            Category,
            onLineDescription,
            fullDescription,
            employeeCountRange,
            inCorporationDate,
            logoURL,
            registerationStatus = "pending",
            rejectionReason = "",
            country,
            state,
            city,
            address,
            fundingRound,
            socialLinks
        } = req.body;

        if (!userId) {
            return res.json({ success: false, message: "User session not found. Please log in." });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Validate user role is 'startup'
        if (user.role !== "startup") {
            return res.json({ success: false, message: "Only startup users can register a startup" });
        }

        const existingStartup = await StartUpRegModel.findOne({ StartupId: userId });
        if (existingStartup) {
            return res.json({ success: false, message: "A startup already exists for this account." });
        }

        const startup = new StartUpRegModel({
            StartupId: userId,
            StartUpName,
            legalName,
            WebSiteUrl,
            Category,
            onLineDescription,
            fullDescription,
            employeeCountRange,
            inCorporationDate,
            logoURL,
            registerationStatus,
            rejectionReason,
            country,
            state,
            city,
            address,
            fundingRound,
            socialLinks
        });

        await startup.save();
        return res.json({ success: true, message: "Startup registered successfully", startup });

    } catch (error) {
        console.error("Error registering startup:", error);
        return res.json({ success: false, message: error.message });
    }
};

export const getAllStartups = async (req, res) => {
    try {
        let startups = await StartUpRegModel.find().lean();
        
        // Auto-seed if database collection is empty
        if (startups.length === 0) {
            const user = await userModel.findOne();
            if (user) {
                const initialSeed = [
                    {
                        StartupId: user._id,
                        StartUpName: "Apex AI",
                        legalName: "Apex Artificial Intelligence Ltd",
                        WebSiteUrl: "https://apex.ai",
                        Category: "technology",
                        onLineDescription: "Autonomous AI developer agents for production software engineering.",
                        fullDescription: "To accelerate human software engineering by building state-of-the-art AI agents that can seamlessly integrate into git workflows, resolve complex PRs, and run test suites autonomously.",
                        employeeCountRange: "1-10",
                        inCorporationDate: new Date("2024-01-01"),
                        logoURL: "from-emerald-500 to-teal-600",
                        registerationStatus: "approved",
                        country: "United States",
                        state: "California",
                        city: "San Francisco",
                        address: "San Francisco, CA",
                        fundingRound: {
                            stage: "seed",
                            totalRaise: 0,
                            targetRaised: 1000000
                        }
                    },
                    {
                        StartupId: user._id,
                        StartUpName: "QuantFlow",
                        legalName: "QuantFlow Technologies Inc",
                        WebSiteUrl: "https://quantflow.io",
                        Category: "fintech",
                        onLineDescription: "High-frequency analytics and algorithmic trading infrastructure.",
                        fullDescription: "To democratize high-speed quantitative data pipelines by offering cloud-native, low-latency streaming infrastructure for hedge funds and retail researchers.",
                        employeeCountRange: "11-50",
                        inCorporationDate: new Date("2023-05-15"),
                        logoURL: "from-purple-500 to-indigo-600",
                        registerationStatus: "approved",
                        country: "United States",
                        state: "New York",
                        city: "New York",
                        address: "New York, NY",
                        fundingRound: {
                            stage: "series A",
                            totalRaise: 0,
                            targetRaised: 5000000
                        }
                    },
                    {
                        StartupId: user._id,
                        StartUpName: "MedVibe",
                        legalName: "MedVibe Health Systems LLC",
                        WebSiteUrl: "https://medvibe.com",
                        Category: "healthcare",
                        onLineDescription: "Non-invasive real-time metabolic tracking wearables.",
                        fullDescription: "We build biosensors that analyze sweat biomarkers to provide metabolic insight, helping users manage health conditions without fingerpricks.",
                        employeeCountRange: "1-10",
                        inCorporationDate: new Date("2023-11-20"),
                        logoURL: "from-rose-500 to-pink-600",
                        registerationStatus: "approved",
                        country: "United States",
                        state: "Massachusetts",
                        city: "Boston",
                        address: "Boston, MA",
                        fundingRound: {
                            stage: "pre-seed",
                            totalRaise: 0,
                            targetRaised: 50000
                        }
                    }
                ];
                
                await StartUpRegModel.insertMany(initialSeed);
                startups = await StartUpRegModel.find().lean();
            }
        }
        
        return res.json({ success: true, startups });
    } catch (error) {
        console.error("Error fetching startups:", error);
        return res.json({ success: false, message: error.message });
    }
};

export const getStartupById = async (req, res) => {
    try {
        const { id } = req.params;

        if (id && id.startsWith("ext_wf_")) {
            // Check memory cache first
            let cached = externalCache.get(id);
            if (cached) {
                return res.json({ success: true, startup: cached });
            }

            // Fallback: Query Netrows API to populate cache if empty
            const userCity = "bangalore";
            try {
                const apiResponse = await axios.get("https://api.netrows.com/v1/wellfound/companies", {
                    params: {
                        location: userCity,
                        limit: 15
                    },
                    headers: {
                        "X-API-Key": process.env.NETROWS_API_KEY
                    }
                });
                const vendorList = apiResponse.data?.companies || [];
                for (const comp of vendorList) {
                    const extId = comp.id || `ext_wf_${comp.slug || ""}`;
                    const normalizedId = extId.startsWith("ext_wf_") ? extId : `ext_wf_${extId}`;
                    const normalized = {
                        _id: normalizedId,
                        id: normalizedId,
                        StartUpName: comp.name,
                        companyName: comp.name,
                        motto: comp.tagline || "Innovative tech startup.",
                        onLineDescription: comp.tagline || "Innovative tech startup.",
                        logoURL: comp.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comp.name)}&background=0D8ABC&color=fff`,
                        logoUrl: comp.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comp.name)}&background=0D8ABC&color=fff`,
                        location: {
                            city: userCity,
                            area: "Central District",
                            country: "India"
                        },
                        city: userCity,
                        state: "Delhi",
                        address: `${userCity}, India`,
                        fullDescription: comp.description || "Innovative tech startup expanding its reach and building cutting-edge tools.",
                        website: comp.domain ? `https://${comp.domain}` : "",
                        WebSiteUrl: comp.domain ? `https://${comp.domain}` : "",
                        employeeCountRange: comp.size || "11-50",
                        fundingRound: {
                            stage: comp.funding_stage || "Seed"
                        },
                        techStack: comp.tech_stack || ["React", "Node.js", "MongoDB"],
                        founders: comp.founders ? comp.founders.join(", ") : "Talent Acquisition Team",
                        hrContact: {
                            managerName: "Talent Acquisition Team",
                            email: comp.contact_email || `talent@${comp.domain || "startup.io"}`,
                            linkedIn: comp.linkedin_url || "",
                            careersPage: comp.jobs_url || `https://wellfound.com/company/${comp.slug}/jobs`
                        },
                        source: "external_directory"
                    };
                    externalCache.set(normalizedId, normalized);
                }
            } catch (err) {
                console.error("Failed to query Netrows API for fallback fetch:", err.message);
            }

            cached = externalCache.get(id);
            if (cached) {
                return res.json({ success: true, startup: cached });
            }

            return res.json({ success: false, message: "External startup not found or session expired" });
        }

        // Validate that ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid startup ID format" });
        }

        // If mongo ObjectId, fetch from DB
        const startup = await StartUpRegModel.findById(id).lean();
        if (!startup) {
            return res.json({ success: false, message: "Startup not found" });
        }
        return res.json({ success: true, startup });
    } catch (error) {
        console.error("Error fetching startup by id:", error);
        return res.json({ success: false, message: error.message });
    }
};
