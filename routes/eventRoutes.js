import express from 'express';
import { getAllDashboardEvents } from '../controllers/eventController.js';

const Eventrouter=express.Router();

Eventrouter.get(
    "/events",getAllDashboardEvents
);

export default Eventrouter;
