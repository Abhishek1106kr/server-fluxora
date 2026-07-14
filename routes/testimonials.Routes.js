import express from "express";
import { getLiveTestimonials, submitTestimonial } from "../controllers/testimonials.controller.js";

const testmonialRouter=express.Router();

testmonialRouter.get("/",getLiveTestimonials);
testmonialRouter.post("/",submitTestimonial);

export default testmonialRouter;
