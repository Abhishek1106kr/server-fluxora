import express from 'express';
import {register, login, logout, sendVerifyOtp, verifyEmail, isAuthenticated, sendResetOtp, resetPassword} from '../controllers/authController.js'
import userAuth from '../middleware/userAuth.js';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const authRouter=express.Router();


authRouter.post("/register",register)
authRouter.post("/login",login)
authRouter.post("/logout",logout)
authRouter.post('/send-verify-otp',userAuth, sendVerifyOtp);
authRouter.post('/verify-account',userAuth,verifyEmail );
authRouter.post('/is-Auth',userAuth, isAuthenticated);
authRouter.post('/send-reset-otp',sendResetOtp);
authRouter.post('/reset-password',resetPassword);

// --- AUTH ROUTE ENTRANCES ---
authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
authRouter.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// --- AUTH ROUTE CALLBACKS ---
authRouter.get('/google/callback', 
  passport.authenticate('google', { session: false }), 
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.cookie('token', token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    res.redirect(`http://localhost:5173/login-success?token=${token}`);
  }
);

authRouter.get('/github/callback', 
  passport.authenticate('github', { session: false }), 
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.cookie('token', token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    res.redirect(`http://localhost:5173/login-success?token=${token}`);
  }
);

export default authRouter;
