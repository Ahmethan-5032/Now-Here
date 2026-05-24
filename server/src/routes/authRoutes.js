const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Post = require("../models/Post");
const { memoryUsers, memoryPosts, verificationCodes } = require("../data/memoryStore");
const { clearAuthCookie, requireAuth, normalizeAuthUser, setAuthCookie } = require("../middleware/auth");
const { authLimiter, verificationLimiter, writeLimiter } = require("../middleware/security");
const { deliverVerificationCode } = require("../services/verificationDelivery");
const { getJwtSecret } = require("../config/env");
const { cleanText, isEmail, isSafeDataImage, normalizeEmail, validatePassword } = require("../utils/validation");
const { verifyRouteProof } = require("../utils/routeProof");

const router = express.Router();
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-password", 12);
const TOKEN_RESPONSE_ENABLED = process.env.AUTH_TOKEN_RESPONSE === "true";

const badgeCatalog = [
  {
    id: "ilk-adim",
    title: "Ilk Adim",
    description: "Ilk paylasimini yapti.",
    test: (stats) => stats.postsCount >= 1,
  },
  {
    id: "profil-mimari",
    title: "Profil Mimari",
    description: "Bio, sehir veya ilgi alanlarini tamamlayarak profilini genisletti.",
    test: (stats) => stats.profileCompleteness >= 70,
  },
  {
    id: "rota-gezgini",
    title: "Rota Gezgini",
    description: "Toplam 1 km rota kaydetti.",
    test: (stats) => stats.distanceMeters >= 1000,
  },
  {
    id: "sehir-kasifi",
    title: "Sehir Kasifi",
    description: "Toplam 10 km rota kaydetti.",
    test: (stats) => stats.distanceMeters >= 10000,
  },
  {
    id: "sevilen-paylasimci",
    title: "Sevilen Paylasimci",
    description: "Paylasimlari 10 begeni aldi.",
    test: (stats) => stats.receivedLikes >= 10,
  },
  {
    id: "sosyal-rota",
    title: "Sosyal Rota",
    description: "5 yorum yazdi.",
    test: (stats) => stats.commentsGiven >= 5,
  },
  {
    id: "destekci",
    title: "Destekci",
    description: "10 paylasimi begendi.",
    test: (stats) => stats.likesGiven >= 10,
  },
  {
    id: "etiket-ustasi",
    title: "Etiket Ustasi",
    description: "Paylasimlarinda toplam 8 etiket kullandi.",
    test: (stats) => stats.tagsUsed >= 8,
  },
];

function usesDatabase() {
  return mongoose.connection.readyState === 1;
}

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function publicUser(user) {
  return normalizeAuthUser(user);
}

function signToken(user) {
  const source = typeof user.toObject === "function" ? user.toObject() : user;
  return jwt.sign({ id: String(source._id || source.id) }, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: "7d",
    audience: "now-here-client",
    issuer: "now-here-api",
  });
}

function createCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function codeKey(target) {
  return `email:${target}`;
}

function storeVerificationCode(target) {
  const code = createCode();
  const now = Date.now();
  for (const [key, record] of verificationCodes.entries()) {
    if (record.expiresAt < now) verificationCodes.delete(key);
  }
  if (verificationCodes.size > 5000) {
    const error = new Error("Dogrulama servisi yogun. Biraz sonra tekrar dene.");
    error.status = 503;
    throw error;
  }
  const existing = verificationCodes.get(codeKey(target));

  if (existing?.lastSentAt && now - existing.lastSentAt < 60 * 1000) {
    const error = new Error("Yeni kod istemeden once 60 saniye bekle.");
    error.status = 429;
    throw error;
  }

  verificationCodes.set(codeKey(target), {
    codeHash: crypto.createHash("sha256").update(code).digest("hex"),
    attempts: 0,
    lastSentAt: now,
    expiresAt: now + 10 * 60 * 1000,
  });
  return code;
}

function publicDelivery(delivery) {
  return {
    sent: Boolean(delivery.sent),
    channel: "email",
    provider: delivery.provider || "brevo",
    messageId: delivery.id,
  };
}

function verifyCode(target, code) {
  const key = codeKey(target);
  const record = verificationCodes.get(key);

  if (!record || record.expiresAt < Date.now()) {
    verificationCodes.delete(key);
    return false;
  }

  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts > 5) {
    verificationCodes.delete(key);
    return false;
  }

  const codeHash = crypto.createHash("sha256").update(String(code || "").trim()).digest("hex");
  const hashMatches =
    record.codeHash.length === codeHash.length &&
    crypto.timingSafeEqual(Buffer.from(record.codeHash), Buffer.from(codeHash));
  if (!hashMatches) {
    return false;
  }

  verificationCodes.delete(key);
  return true;
}

function respondWithSession(res, status, user, extra = {}) {
  const token = signToken(user);
  setAuthCookie(res, token);
  return res.status(status).json({
    ...extra,
    ...(TOKEN_RESPONSE_ENABLED ? { token } : {}),
    user: publicUser(user),
  });
}

function validateRegisterInput(body) {
  const firstName = cleanText(body.firstName, 60);
  const lastName = cleanText(body.lastName, 60);
  const avatarName = cleanText(body.avatarName || body.displayName, 36);
  const password = String(body.password || "");
  const email = normalizeEmail(body.email || "");
  const target = email;

  if (!firstName || !lastName || !avatarName) {
    return { error: "Ad, soyad ve avatar adi zorunlu." };
  }

  if (!/^[a-zA-ZğüşöçıİĞÜŞÖÇ0-9._ -]{2,60}$/.test(firstName)) {
    return { error: "Ad sadece harf, rakam, bosluk, nokta, tire ve alt cizgi icerebilir." };
  }

  if (!/^[a-zA-ZğüşöçıİĞÜŞÖÇ0-9._ -]{2,60}$/.test(lastName)) {
    return { error: "Soyad sadece harf, rakam, bosluk, nokta, tire ve alt cizgi icerebilir." };
  }

  if (!/^[a-zA-Z0-9._-]{3,36}$/.test(avatarName)) {
    return { error: "Avatar adi 3-36 karakter olmali; harf, rakam, nokta, tire veya alt cizgi kullan." };
  }

  if (!isEmail(email)) {
    return { error: "Gecerli bir e-posta gir." };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  return { firstName, lastName, avatarName, password, email, target };
}

async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);

  if (!usesDatabase()) {
    return memoryUsers.find((user) => user.email === normalized);
  }

  return User.findOne({ email: normalized }).select("+password");
}

async function passwordMatches(password, storedPassword) {
  if (!storedPassword) return false;
  if (storedPassword.startsWith("$2")) {
    return bcrypt.compare(password, storedPassword);
  }
  return password === storedPassword;
}

async function findExistingUser(email) {
  if (!usesDatabase()) {
    return memoryUsers.find((user) => user.email === email);
  }

  return User.findOne({ email });
}

async function createVerifiedUser(data) {
  if (!isSafeDataImage(data.profilePhoto || "")) {
    const error = new Error("Profil fotografi yalnizca png, jpg veya webp ve 900KB alti olmali.");
    error.status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const displayName = data.avatarName;

  if (!usesDatabase()) {
    const user = {
      id: createId(),
      firstName: data.firstName,
      lastName: data.lastName,
      displayName,
      avatarName: data.avatarName,
      email: data.email,
      passwordHash,
      profilePhoto: data.profilePhoto || "",
      bio: cleanText(data.bio, 220),
      city: cleanText(data.city, 80),
      website: cleanText(data.website, 140),
      statusText: cleanText(data.statusText || "Kesifte", 80),
      interests: Array.isArray(data.interests) ? data.interests : [],
      profileTheme: data.profileTheme || "lime",
      emailVerified: true,
      distanceMeters: Number(data.distanceMeters) || 0,
    };
    memoryUsers.push(user);
    return user;
  }

  return User.create({
    firstName: data.firstName,
    lastName: data.lastName,
    displayName,
    avatarName: data.avatarName,
    email: data.email,
    password: passwordHash,
    profilePhoto: data.profilePhoto || "",
    bio: cleanText(data.bio, 220),
    city: cleanText(data.city, 80),
    website: cleanText(data.website, 140),
    statusText: cleanText(data.statusText || "Kesifte", 80),
    interests: Array.isArray(data.interests) ? data.interests : [],
    profileTheme: data.profileTheme || "lime",
    emailVerified: true,
    distanceMeters: Number(data.distanceMeters) || 0,
  });
}

function normalizePost(post) {
  const source = typeof post.toObject === "function" ? post.toObject() : post;
  return {
    _id: String(source._id),
    authorId: source.authorId || "",
    authorName: source.authorName || "Gezgin",
    description: source.description || "",
    lat: Number(source.lat),
    lng: Number(source.lng),
    placeName: source.placeName || "Konum",
    category: source.category || "genel",
    mood: source.mood || "calm",
    rating: Number(source.rating) || 0,
    tags: Array.isArray(source.tags) ? source.tags : [],
    image: source.image || "",
    likes: Number(source.likes) || 0,
    likedBy: source.likedBy || [],
    comments: source.comments || [],
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

async function getAllPosts() {
  if (!usesDatabase()) return memoryPosts.map(normalizePost);
  const posts = await Post.find().sort({ createdAt: -1 });
  return posts.map(normalizePost);
}

function normalizeInterestList(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  return Array.from(
    new Set(
      source
        .map((item) => cleanText(item, 24).replace(/^#/, "").toLowerCase())
        .filter((item) => /^[a-z0-9ğüşöçı._-]{2,24}$/i.test(item))
    )
  ).slice(0, 8);
}

function calculateProfileCompleteness(user) {
  const checks = [
    user.firstName,
    user.lastName,
    user.avatarName,
    user.profilePhoto,
    user.bio,
    user.city,
    user.statusText,
    user.interests?.length,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function buildProfile(user, posts) {
  const currentUser = publicUser(user);
  const myPosts = posts.filter((post) => post.authorId === currentUser.id);
  const likedPosts = posts.filter((post) => (post.likedBy || []).includes(currentUser.id));
  const comments = posts.flatMap((post) =>
    (post.comments || [])
      .filter((comment) => comment.userId === currentUser.id)
      .map((comment) => ({
        ...comment,
        postId: post._id,
        postTitle: post.placeName,
      }))
  );
  const receivedLikes = myPosts.reduce((sum, post) => sum + (Number(post.likes) || 0), 0);
  const tagsUsed = myPosts.reduce((sum, post) => sum + (post.tags || []).length, 0);
  const categoryBreakdown = myPosts.reduce((acc, post) => {
    const key = post.category || "genel";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const favoriteCategory = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || "genel";
  const profileCompleteness = calculateProfileCompleteness(currentUser);
  const score = myPosts.length * 120 + receivedLikes * 45 + comments.length * 35 + likedPosts.length * 20 + Math.round(currentUser.distanceMeters / 20) + profileCompleteness;
  const level = Math.max(1, Math.floor(score / 350) + 1);
  const stats = {
    postsCount: myPosts.length,
    receivedLikes,
    likesGiven: likedPosts.length,
    commentsGiven: comments.length,
    distanceMeters: currentUser.distanceMeters,
    tagsUsed,
    favoriteCategory,
    profileCompleteness,
    score,
    level,
  };

  const recentActivity = [
    ...myPosts.slice(0, 5).map((post) => ({
      id: `post-${post._id}`,
      type: "post",
      title: post.placeName,
      text: post.description || "Fotografli paylasim",
      createdAt: post.createdAt,
    })),
    ...comments.slice(0, 5).map((comment) => ({
      id: `comment-${comment._id}`,
      type: "comment",
      title: comment.postTitle,
      text: comment.text,
      createdAt: comment.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 8);

  return {
    user: currentUser,
    stats,
    categoryBreakdown,
    recentActivity,
    badges: badgeCatalog.map((badge) => ({
      id: badge.id,
      title: badge.title,
      description: badge.description,
      unlocked: badge.test(stats),
    })),
    posts: myPosts,
    likedPosts,
    comments,
  };
}

router.post("/request-code", verificationLimiter, async (req, res) => {
  try {
    const target = normalizeEmail(req.body.email || "");

    if (!isEmail(target)) {
      return res.status(400).json({ message: "Gecerli bir e-posta gir." });
    }

    const code = storeVerificationCode(target);
    const delivery = await deliverVerificationCode({ target, code });

    return res.json({
      message: "Dogrulama kodu e-posta adresine gonderildi.",
      delivery: publicDelivery(delivery),
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      message: err.message || "Dogrulama kodu gonderilemedi.",
    });
  }
});

router.post("/register", authLimiter, async (req, res) => {
  try {
    const data = validateRegisterInput(req.body);
    if (data.error) return res.status(400).json({ message: data.error });

    if (!verifyCode(data.target, req.body.code)) {
      return res.status(400).json({ message: "Dogrulama kodu hatali veya suresi doldu." });
    }

    const existing = await findExistingUser(data.email);
    if (existing) {
      return res.status(409).json({ message: "Bu hesap bilgileri zaten kayitli." });
    }

    const user = await createVerifiedUser({
      ...data,
      profilePhoto: req.body.profilePhoto || "",
      distanceMeters: 0,
    });

    return respondWithSession(res, 201, user);
  } catch (err) {
    console.error("register hata:", err);
    return res.status(err.status || 500).json({ message: err.status ? err.message : "Kayit olusturulamadi." });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email || "");
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "E-posta ve sifre zorunlu." });
    }

    if (!isEmail(email)) {
      return res.status(400).json({ message: "Gecerli bir e-posta gir." });
    }

    const user = await findUserByEmail(email);
    const passwordHash = user?.password || user?.passwordHash || DUMMY_PASSWORD_HASH;
    const matches = await passwordMatches(password, passwordHash);

    if (!user || !matches) {
      return res.status(401).json({ message: "Giris bilgileri hatali." });
    }

    return respondWithSession(res, 200, user);
  } catch (err) {
    console.error("login hata:", err);
    return res.status(500).json({ message: "Giris yapilamadi." });
  }
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

router.post("/recover-local", authLimiter, async (req, res) => {
  try {
    if (process.env.ALLOW_LOCAL_ACCOUNT_RECOVERY !== "true") {
      return res.status(403).json({ message: "Yerel hesap kurtarma kapali." });
    }

    const data = validateRegisterInput(req.body);
    if (data.error) return res.status(400).json({ message: data.error });

    const existing = await findUserByEmail(data.email);
    if (existing) {
      const passwordHash = existing?.password || existing?.passwordHash;
      const matches = await passwordMatches(data.password, passwordHash);

      if (!matches) {
        return res.status(401).json({ message: "Giris bilgileri hatali." });
      }

      return respondWithSession(res, 200, existing, { recovered: false });
    }

    const user = await createVerifiedUser({
      ...data,
      profilePhoto: req.body.profilePhoto || "",
      distanceMeters: req.body.distanceMeters || 0,
    });

    return respondWithSession(res, 201, user, { recovered: true });
  } catch (err) {
    console.error("local recovery hata:", err);
    return res.status(500).json({ message: "Yerel hesap MongoDB'ye tasinamadi." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const posts = await getAllPosts();
  return res.json(buildProfile(req.user, posts));
});

router.put("/me", requireAuth, writeLimiter, async (req, res) => {
  try {
    const profilePhoto = req.body.profilePhoto ?? req.user.profilePhoto;
    if (!isSafeDataImage(profilePhoto || "")) {
      return res.status(400).json({ message: "Profil fotografi yalnizca png, jpg veya webp ve 900KB alti olmali." });
    }

    const updates = {
      firstName: cleanText(req.body.firstName || req.user.firstName || "", 60),
      lastName: cleanText(req.body.lastName || req.user.lastName || "", 60),
      avatarName: cleanText(req.body.avatarName || req.user.avatarName || "", 36),
      displayName: cleanText(req.body.avatarName || req.user.displayName || "", 36),
      profilePhoto,
      bio: cleanText(req.body.bio ?? req.user.bio ?? "", 220),
      city: cleanText(req.body.city ?? req.user.city ?? "", 80),
      website: cleanText(req.body.website ?? req.user.website ?? "", 140),
      statusText: cleanText(req.body.statusText ?? req.user.statusText ?? "Kesifte", 80),
      interests: normalizeInterestList(req.body.interests ?? req.user.interests),
      profileTheme: ["lime", "aqua", "amber", "violet"].includes(req.body.profileTheme)
        ? req.body.profileTheme
        : req.user.profileTheme || "lime",
    };

    if (!updates.firstName || !updates.lastName || !updates.avatarName) {
      return res.status(400).json({ message: "Ad, soyad ve avatar adi zorunlu." });
    }

    if (!/^[a-zA-Z0-9._-]{3,36}$/.test(updates.avatarName)) {
      return res.status(400).json({ message: "Avatar adi 3-36 karakter olmali; harf, rakam, nokta, tire veya alt cizgi kullan." });
    }

    let user;
    if (!usesDatabase()) {
      user = memoryUsers.find((item) => item.id === req.user.id);
      Object.assign(user, updates);
    } else {
      user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    }

    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("profile update hata:", err);
    return res.status(500).json({ message: "Profil guncellenemedi." });
  }
});

router.post("/me/distance", requireAuth, writeLimiter, async (req, res) => {
  const meters = Math.round(Math.max(0, Number(req.body.meters) || 0));
  const proof = verifyRouteProof(req.body.routeProof, req.user.id);

  if (!proof) {
    return res.status(403).json({ message: "Rota dogrulama kaniti gecersiz." });
  }

  const maxAllowedMeters = Math.min(Number(proof.distance) * 1.15, 50000);
  if (meters < 25 || meters > maxAllowedMeters) {
    return res.status(400).json({ message: "Rota mesafesi dogrulanamadi." });
  }

  if (!usesDatabase()) {
    const user = memoryUsers.find((item) => item.id === req.user.id);
    user.distanceMeters = (Number(user.distanceMeters) || 0) + meters;
    const posts = await getAllPosts();
    return res.json(buildProfile(user, posts));
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $inc: { distanceMeters: meters } },
    { new: true }
  );
  const posts = await getAllPosts();
  return res.json(buildProfile(user, posts));
});

module.exports = router;
