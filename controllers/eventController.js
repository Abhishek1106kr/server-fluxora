import UpcomingEvent from "../models/UpcomingEvent.Model.js";
import axios from "axios";

/**
 * Fetch hackathons from Devpost's public listing feed.
 * Devpost provides RSS / JSON via their hackathon search endpoint.
 */
async function fetchDevpostEvents() {
  try {
    const res = await axios.get("https://devpost.com/api/hackathons.json", {
      params: {
        status: "upcoming",
        order_by: "deadline",
        per_page: 10,
      },
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; Fluxora/1.0)",
      },
      timeout: 6000,
    });

    const hackathons = res.data?.hackathons || [];

    return hackathons.map((h) => ({
      _id: `ext_devpost_${h.id}`,
      title: h.title || "Untitled Hackathon",
      type: "Hackathon",
      source: "external_feed",
      startDate: h.submission_period_dates
        ? new Date(h.submission_period_dates.split("–")[0].trim())
        : new Date(),
      location: h.displayed_location?.location || "Online",
      registrationLink: h.url || "https://devpost.com/hackathons",
      tags: (h.themes || []).map((t) => t.name).filter(Boolean),
    }));
  } catch (err) {
    console.warn("[eventController] Devpost fetch failed:", err.message);
    return [];
  }
}

export const getAllDashboardEvents = async (req, res) => {
  try {
    // 1. Fetch upcoming platform events from MongoDB (always works)
    const platformEvents = await UpcomingEvent.find({
      startDate: { $gte: new Date() },
    })
      .sort({ startDate: 1 })
      .lean();

    // 2. Try fetching from Devpost (graceful fallback on failure)
    const externalEvents = await fetchDevpostEvents();

    // 3. Merge, de-duplicate by title, sort chronologically
    const seen = new Set(platformEvents.map((e) => e.title.toLowerCase()));
    const uniqueExternal = externalEvents.filter(
      (e) => !seen.has(e.title.toLowerCase())
    );

    const unifiedEventsList = [...platformEvents, ...uniqueExternal].sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate)
    );

    return res.status(200).json({
      success: true,
      count: unifiedEventsList.length,
      sources: {
        platform: platformEvents.length,
        external: uniqueExternal.length,
      },
      data: unifiedEventsList,
    });
  } catch (error) {
    console.error("[eventController] getAllDashboardEvents error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};