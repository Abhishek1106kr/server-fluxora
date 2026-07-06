import express from 'express';
import { registerStartup, getAllStartups, getStartupById } from "../controllers/startup.authController.js";
import { getLocalStartups } from "../controllers/startupController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.post("/register", userAuth, registerStartup);
router.get("/all", getAllStartups);
router.get("/local", getLocalStartups);
router.get("/:id", getStartupById);

export default router;
