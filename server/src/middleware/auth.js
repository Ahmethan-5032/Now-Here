const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { memoryUsers } = require("../data/memoryStore");

function usesDatabase() {
  return mongoose.connection.readyState === 1;
}

function getToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice(7);
}

async function attachUser(req, res, next) {
  const token = getToken(req);
  if (!token) return next();

  try {
    const secret = process.env.JWT_SECRET || "now-here-development-secret";
    const payload = jwt.verify(token, secret);
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
  requireAuth,
  normalizeAuthUser,
};
