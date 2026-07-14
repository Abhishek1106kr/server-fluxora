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
    let localDbStartups = await StartUpRegModel.find({
      city: { $regex: new RegExp(`^${userCity}$`, "i") }
    }).lean();

    if (localDbStartups.length === 0) {
      // Fallback: fetch all startups in database so the local matching directory doesn't appear empty
      localDbStartups = await StartUpRegModel.find().lean();
    }

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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/startup/nearby
// Proxy for Google Places Nearby Search + Place Details.
// Query params:
//   lat      – latitude  (required)
//   lng      – longitude (required)
//   radius   – metres, default 10000 (10 km)
//   keyword  – search keyword, default "startup"
//   keywords – comma-separated list of keywords to merge (e.g. "startup,AI company")
// ─────────────────────────────────────────────────────────────────────────────
const GOOGLE_PLACES_KEY = "AIzaSyCn5jsN4Fczj1jpofBydeTu2yNRTOgs5UM";
const PLACES_BASE = "https://maps.googleapis.com/maps/api";

/** Fetch one page of Place Search results for a single keyword */
async function searchPlaces(lat, lng, radius, keyword) {
  const res = await axios.get(`${PLACES_BASE}/place/nearbysearch/json`, {
    params: {
      location: `${lat},${lng}`,
      radius,
      keyword,
      key: GOOGLE_PLACES_KEY,
    },
    timeout: 10000,
  });
  return res.data?.results || [];
}

/** Fetch detailed fields for a single place_id */
async function fetchPlaceDetails(placeId) {
  try {
    const res = await axios.get(`${PLACES_BASE}/place/details/json`, {
      params: {
        place_id: placeId,
        fields: "name,website,formatted_phone_number,formatted_address,opening_hours,photos,geometry,rating,user_ratings_total,url",
        key: GOOGLE_PLACES_KEY,
      },
      timeout: 8000,
    });
    return res.data?.result || {};
  } catch {
    return {};
  }
}

/** Build a Google photo URL from a photo_reference */
function photoUrl(ref, maxWidth = 400) {
  if (!ref) return "";
  return `${PLACES_BASE}/place/photo?maxwidth=${maxWidth}&photo_reference=${ref}&key=${GOOGLE_PLACES_KEY}`;
}

/** Normalise a Google Places result into the app's startup shape */
function normalisePlaceResult(place, details = {}) {
  const logo = place.photos?.[0]?.photo_reference
    ? photoUrl(place.photos[0].photo_reference, 200)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(place.name)}&background=0D8ABC&color=fff&size=200`;

  const lat = place.geometry?.location?.lat;
  const lng = place.geometry?.location?.lng;

  return {
    _id: `gp_${place.place_id}`,
    id:  `gp_${place.place_id}`,
    placeId: place.place_id,
    StartUpName: place.name,
    companyName: place.name,
    onLineDescription: place.types?.filter(t => t !== "point_of_interest" && t !== "establishment")
      .map(t => t.replace(/_/g, " ")).join(" · ") || "Tech company on Google Maps",
    logoURL: logo,
    logoUrl: logo,
    address: details.formatted_address || place.vicinity || "",
    city: place.vicinity?.split(",").pop()?.trim() || "",
    WebSiteUrl: details.website || "",
    website:    details.website || "",
    phone: details.formatted_phone_number || "",
    mapsUrl: details.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    openNow: place.opening_hours?.open_now ?? null,
    openingHours: details.opening_hours?.weekday_text || [],
    rating: place.rating || null,
    ratingCount: place.user_ratings_total || 0,
    coordinates: lat && lng ? { lat, lng } : null,
    photos: (place.photos || []).slice(0, 3).map(p => photoUrl(p.photo_reference, 600)),
    employeeCountRange: "11-50",
    fundingRound: { stage: "seed" },
    techStack: [],
    source: "google_places",
  };
}

export const getNearbyStartups = async (req, res) => {
  try {
    const { lat, lng, radius = 10000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: "lat and lng query params are required" });
    }

    // Support a comma-sep list of keywords, or use the default set
    const rawKeywords = req.query.keywords || req.query.keyword || "";
    const keywords = rawKeywords
      ? rawKeywords.split(",").map(k => k.trim()).filter(Boolean)
      : ["startup", "software company", "AI company", "tech company", "SaaS company"];

    // Fire all keyword searches in parallel
    const allResults = await Promise.allSettled(
      keywords.map(kw => searchPlaces(lat, lng, radius, kw))
    );

    // Deduplicate by place_id
    const seenIds = new Set();
    const unique = [];
    for (const r of allResults) {
      if (r.status !== "fulfilled") continue;
      for (const place of r.value) {
        if (!seenIds.has(place.place_id)) {
          seenIds.add(place.place_id);
          unique.push(place);
        }
      }
    }

    // Sort by rating (highest first)
    unique.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // Fetch Place Details for the top 15 results (to get website / phone)
    // We batch to avoid hitting quota
    const TOP_N = 15;
    const top = unique.slice(0, TOP_N);
    const detailsArr = await Promise.allSettled(
      top.map(p => fetchPlaceDetails(p.place_id))
    );

    const normalised = top.map((place, i) => {
      const detail = detailsArr[i]?.status === "fulfilled" ? detailsArr[i].value : {};
      return normalisePlaceResult(place, detail);
    });

    return res.status(200).json({
      success: true,
      count: normalised.length,
      total_found: unique.length,
      data: normalised,
    });
  } catch (error) {
    console.error("[getNearbyStartups] Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};