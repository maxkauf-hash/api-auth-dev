import { Router } from "express";
import passport from "passport";
import {
  register,
  login,
  authStatus,
  logout,
  setup2FA,
  verify2FA,
  reset2FA,
} from "../controllers/authController.js";

const router = Router();

//Registration route
router.post("/register", register);

//Login route
router.post("/login", passport.authenticate("local"), login);

// Auth Status route
router.get("/status", authStatus);

// 2FA setup
router.post(
  "/2fa/setup",
  (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.json({ status: 401, message: "Unauthorized user" });
  },
  setup2FA
);

// 2FA verification
router.post(
  "/2fa/verify",
  (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.json({ status: 401, message: "Unauthorized user" });
  },
  verify2FA
);

// 2FA reset
router.post(
  "/2fa/reset",
  (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.json({ status: 401, message: "Unauthorized user" });
  },
  reset2FA
);

// Logout route
router.post("/logout", logout);

export default router;
