import express from 'express';
import { registerStartup, getAllStartups, getStartupById } from "../controllers/startup.authController.js";
import { getLocalStartups, getNearbyStartups } from "../controllers/startupController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.post("/register", userAuth, registerStartup);
router.get("/all", getAllStartups);
router.get("/local", getLocalStartups);
router.get("/nearby", getNearbyStartups);   // Google Places proxy
router.get("/:id", getStartupById);

export default router;
