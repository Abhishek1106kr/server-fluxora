import express from 'express';
import { optimizeResume } from '../controllers/resumeController.js';
import userAuth from '../middleware/userAuth.js';

const resumeRouter = express.Router();

resumeRouter.post('/optimize', userAuth, optimizeResume);

export default resumeRouter;
