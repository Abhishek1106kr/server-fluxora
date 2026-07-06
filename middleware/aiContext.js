import userModel from "../models/userModel.js";

/**
 * Middleware: injectUserCareerContext
 * Fetches the authenticated user's career profile from MongoDB and attaches
 * a normalized `req.careerContext` object for downstream AI controllers.
 */
export const injectUserCareerContext = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.body.userId || req.query.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Access Denied: User identifier is missing. Please log in."
            });
        }

        const userProfile = await userModel.findById(userId).lean();

        if (!userProfile) {
            return res.status(404).json({
                success: false,
                message: "User profile not found in our database."
            });
        }

        const currentResume = userProfile.resumeText || "No resume uploaded yet.";

        const dreamJob = {
            title: userProfile.dreamJob?.title || "Software Developer Engineer",
            targetCompany: userProfile.dreamJob?.targetCompany || "FAANG",
            industry: userProfile.dreamJob?.industry || "Technology",
            desiredSkills: userProfile.dreamJob?.desiredSkills || ["Full-Stack Development"]
        };

        // Attach the assembled career context to the request for AI controllers
        req.careerContext = {
            userId: userProfile._id,
            name: userProfile.name || "Aspiring Engineer",
            currentResume,
            dreamJob,
            careerLevel: userProfile.careerLevel || "Fresher",
            location: userProfile.location || "Unknown",
            yearsOfExperience: userProfile.yearsOfExperience || "0-1"
        };

        next();
    } catch (error) {
        console.error("aiContext middleware error:", error.message);
        return res.status(500).json({
            success: false,
            error: "Failed to assemble user context for AI processing."
        });
    }
};