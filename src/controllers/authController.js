import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const register = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const hashedPassword = await bcryptjs.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { username, email, password: hashedPassword },
    });
    res.json({
      status: 201,
      message: "User registered successfully",
    });
  } catch (error) {
    res.json({
      status: 500,
      error: "Error registring user",
    });
  }
};
export const login = async (req, res) => {
  res.json({
    status: 200,
    message: "User logged in successfully",
    username: req.user.username,
    emailVerified: req.user.emailVerified,
  });
};
export const authStatus = async (req, res) => {
  if (req.user) {
    res.json({
      status: 200,
      message: "User authenticated successfully",
      username: req.user.username,
      emailVerified: req.user.emailVerified,
    });
  } else {
    res.json({
      status: 401,
      message: "Unauthorized user",
    });
  }
};
export const logout = async (req, res) => {
  if (!req.user) return res.json({ status: 401, message: "Unauthorized user" });
  req.logout((err) => {
    if (err) return res.json({ status: 400, message: "User not logged in" });
    res.json({ status: 200, message: "User logged out successfully" });
  });
};
export const setup2FA = async (req, res) => {
  try {
    const user = req.user;
    const secret = speakeasy.generateSecret();
    const userSecret = await prisma.user.update({
      where: { id: user },
      data: { twoFactorSecret: secret.base32 },
    });
    user.emailVerified = true;
    const url = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `${user.username}`,
      issuer: "www.mkwebdev.fr1",
      encoding: "base32",
    });
    const qrcodeImageUrl = await qrcode.toDataURL(url);
    res.json({
      status: 200,
      message: "2FA setup successful",
      secret: secret.base32,
      qrCode: qrcodeImageUrl,
    });
  } catch (error) {
    res.json({
      status: 500,
      error: "Error setting up 2fa",
    });
  }
};
export const verify2FA = async (req, res) => {
  const { token } = req.body;
  const user = req.user;

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
  });

  if (verified) {
    const jwtToken = jwt.sign(
      { username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1hr" }
    );
    res.json({
      status: 200,
      message: "2FA verified successfully",
      token: jwtToken,
    });
  } else {
    res.json({
      status: 401,
      message: "Invalid 2FA token",
    });
  }
};
export const reset2FA = async (req, res) => {
  try {
    const user = req.user;
    const userSecret = await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: "" },
    });
    user.emailVerified = false;
    res.json({
      status: 200,
      message: "2FA reset successful",
    });
  } catch (error) {
    res.json({ status: 500, message: "Error reseting 2FA" });
  }
};
