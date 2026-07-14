import Testimonial from "../models/testmonials.Model.js";

export const getLiveTestimonials = async (req, res) => {
  try {
    const feed = await Testimonial.find({ isApproved: true })
      .sort({ featured: -1, createdAt: -1 })
      .lean();

    // Return the array directly to match the frontend expectations
    return res.status(200).json(feed);
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

// POST: process dynamic user submissions from the feedback form
export const submitTestimonial = async (req, res) => {
  try {
    const { name, role, avatar, content, rating } = req.body;
    if (!name || !role || !content || rating === undefined) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    const finalAvatar = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0F172A&color=34D399&bold=true`;

    const newSubmission = await Testimonial.create({
      name,
      role,
      avatar: finalAvatar,
      content,
      rating: Number(rating),
      isApproved: false // until admin approves
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been submitted to the curation queue.',
      data: newSubmission
    });
  } catch (error) {
    console.error("Error submitting testimonial:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};