const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { memoryUsers } = require("../data/memoryStore");
const { getJwtSecret, isProduction } = require("../config/env");

const SESSION_COOKIE_NAME = "nh_session";
const MAX_TOKEN_LENGTH = 2400;

function usesDatabase() {
  return mongoose.connection.readyState === 1;
}

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    String(cookieHeader || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        const key = index >= 0 ? part.slice(0, index) : part;
        const value = index >= 0 ? part.slice(index + 1) : "";
        return [decodeURIComponent(key), decodeURIComponent(value)];
      })
  );
}

function getToken(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const cookieToken = cookies[SESSION_COOKIE_NAME] || "";
  if (cookieToken && cookieToken.length <= MAX_TOKEN_LENGTH) return cookieToken;

  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return "";
  const token = header.slice(7);
  return token.length <= MAX_TOKEN_LENGTH ? token : "";
}

function getCookieOptions() {
  const sameSite = String(process.env.AUTH_COOKIE_SAMESITE || (isProduction() ? "none" : "lax")).toLowerCase();

  return {
    httpOnly: true,
    secure: isProduction() || sameSite === "none",
    sameSite: ["strict", "lax", "none"].includes(sameSite) ? sameSite : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function setAuthCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    ...getCookieOptions(),
    maxAge: undefined,
  });
}

async function attachUser(req, res, next) {
  const token = getToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      audience: "now-here-client",
      issuer: "now-here-api",
    });
    let user = null;

    if (usesDatabase()) {
      user = await User.findById(payload.id);
    } else {
      user = memoryUsers.find((item) => item.id === payload.id);
    }

    if (user) {
      req.user = normalizeAuthUser(user);
    }
  } catch {
    req.user = null;
  }

  return next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Bu islem icin giris yapmalisin." });
  }
  return next();
}

function normalizeAuthUser(user) {
  const source = typeof user.toObject === "function" ? user.toObject() : user;
  return {
    id: String(source._id || source.id),
    firstName: source.firstName || "",
    lastName: source.lastName || "",
    displayName: source.displayName || source.username || source.avatarName || "",
    avatarName: source.avatarName || source.username || "",
    email: source.email || "",
    profilePhoto: source.profilePhoto || "",
    bio: source.bio || "",
    city: source.city || "",
    website: source.website || "",
    statusText: source.statusText || "Kesifte",
    interests: Array.isArray(source.interests) ? source.interests : [],
    profileTheme: source.profileTheme || "lime",
    distanceMeters: Number(source.distanceMeters) || 0,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

module.exports = {
  attachUser,
  clearAuthCookie,
  requireAuth,
  normalizeAuthUser,
  setAuthCookie,
};
