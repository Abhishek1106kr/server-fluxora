import StartUpRegModel from "../models/StartupRegs.Model.js";
import User from "../models/userModel.js";
import axios from "axios";

// Memory cache for external startups to support detailed views
export const externalCache = new Map();

export const getLocalStartups = async (req, res) => {
  try {
    // 1. Establish the user location criteria
    // Check both req.user (passport/custom session) and req.body (userAuth middleware) and req.query
    const userId = req.user?._id || req.body?.userId || req.query.userId;
    const user = userId ? await User.findById(userId).lean() : null;

    // Use query parameters if explicitly passed from frontend, otherwise read user model location, or default
    const userCity = req.query.city || user?.location?.city || "Bangalore";
    const userArea = req.query.area || user?.location?.area || "Whitefield";

    // 2. Fetch internal verification database startups matching the city
    // StartupRegs.Model uses flat fields: city, state, country (NOT nested location.city)
    const localDbStartups = await StartUpRegModel.find({
      city: { $regex: new RegExp(`^${userCity}$`, "i") }
    }).lean();

    // 3. Fetch external startup directory details from the Netrows API
    let externalStartups = [];
    try {
      const apiResponse = await axios.get("https://api.netrows.com/v1/wellfound/companies", {
        params: {
          location: userCity.toLowerCase(), // Automatically queries by the user's city e.g., "bangalore"
          limit: 15
        },
        headers: {
          "X-API-Key": process.env.NETROWS_API_KEY // Kept secure inside your .env
        }
      });

      const vendorList = apiResponse.data?.companies || [];

      // Normalize properties to seamlessly blend with both local Mongoose schemas and React frontend views
      externalStartups = vendorList.map(comp => {
        const extId = comp.id || `ext_wf_${comp.slug || Math.random().toString(36).substr(2, 5)}`;
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
        return normalized;
      });

    } catch (apiErr) {
      console.error("External startup repository offline, serving verification DB records only:", apiErr.message);
    }

    // 4. Concat streams and move neighborhood anchors (like Whitefield matchers) straight to index 0
    const unifiedCollection = [...localDbStartups, ...externalStartups];
    
    if (userArea) {
      unifiedCollection.sort((a, b) => {
        const aArea = a.location?.area || a.area || "";
        const bArea = b.location?.area || b.area || "";
        const aMatch = aArea.toLowerCase() === userArea.toLowerCase() ? 1 : 0;
        const bMatch = bArea.toLowerCase() === userArea.toLowerCase() ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    res.status(200).json({
      success: true,
      userLocationApplied: { city: userCity, area: userArea },
      count: unifiedCollection.length,
      data: unifiedCollection
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};