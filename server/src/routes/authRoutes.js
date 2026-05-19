const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Post = require("../models/Post");
const { memoryUsers, memoryPosts, verificationCodes } = require("../data/memoryStore");
const { requireAuth, normalizeAuthUser } = require("../middleware/auth");
const { deliverVerificationCode } = require("../services/verificationDelivery");

const router = express.Router();

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

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

function publicUser(user) {
  return normalizeAuthUser(user);
}

function signToken(user) {
  const secret = process.env.JWT_SECRET || "now-here-development-secret";
  const source = typeof user.toObject === "function" ? user.toObject() : user;
  return jwt.sign({ id: String(source._id || source.id) }, secret, { expiresIn: "7d" });
}

function createCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function codeKey(target) {
  return `email:${target}`;
}

function storeVerificationCode(target) {
  const code = createCode();
  verificationCodes.set(codeKey(target), {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
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

  if (record.code !== String(code || "").trim()) {
    return false;
  }

  verificationCodes.delete(key);
  return true;
}

function validateRegisterInput(body) {
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();
  const avatarName = String(body.avatarName || body.displayName || "").trim();
  const password = String(body.password || "");
  const email = normalizeEmail(body.email || "");
  const target = email;

  if (!firstName || !lastName || !avatarName) {
    return { error: "Ad, soyad ve avatar adi zorunlu." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Gecerli bir e-posta gir." };
  }

  if (password.length < 6) {
    return { error: "Sifre en az 6 karakter olmali." };
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
  const passwordHash = await bcrypt.hash(data.password, 10);
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
      bio: data.bio || "",
      city: data.city || "",
      website: data.website || "",
      statusText: data.statusText || "Kesifte",
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
    bio: data.bio || "",
    city: data.city || "",
    website: data.website || "",
    statusText: data.statusText || "Kesifte",
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
        .map((item) => String(item).trim().replace(/^#/, "").toLowerCase())
        .filter(Boolean)
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

router.post("/request-code", async (req, res) => {
  try {
    const target = normalizeEmail(req.body.email || "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
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

router.post("/register", async (req, res) => {
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

    return res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error("register hata:", err);
    return res.status(500).json({ message: "Kayit olusturulamadi." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email || "");
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "E-posta ve sifre zorunlu." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Gecerli bir e-posta gir." });
    }

    const user = await findUserByEmail(email);
    const passwordHash = user?.password || user?.passwordHash;
    const matches = await passwordMatches(password, passwordHash);

    if (!user || !matches) {
      return res.status(401).json({ message: "Giris bilgileri hatali." });
    }

    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error("login hata:", err);
    return res.status(500).json({ message: "Giris yapilamadi." });
  }
});

router.post("/recover-local", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_ACCOUNT_RECOVERY !== "true") {
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

      return res.json({ token: signToken(existing), user: publicUser(existing), recovered: false });
    }

    const user = await createVerifiedUser({
      ...data,
      profilePhoto: req.body.profilePhoto || "",
      distanceMeters: req.body.distanceMeters || 0,
    });

    return res.status(201).json({ token: signToken(user), user: publicUser(user), recovered: true });
  } catch (err) {
    console.error("local recovery hata:", err);
    return res.status(500).json({ message: "Yerel hesap MongoDB'ye tasinamadi." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const posts = await getAllPosts();
  return res.json(buildProfile(req.user, posts));
});

router.put("/me", requireAuth, async (req, res) => {
  try {
    const updates = {
      firstName: String(req.body.firstName || req.user.firstName || "").trim(),
      lastName: String(req.body.lastName || req.user.lastName || "").trim(),
      avatarName: String(req.body.avatarName || req.user.avatarName || "").trim(),
      displayName: String(req.body.avatarName || req.user.displayName || "").trim(),
      profilePhoto: req.body.profilePhoto ?? req.user.profilePhoto,
      bio: String(req.body.bio ?? req.user.bio ?? "").trim().slice(0, 220),
      city: String(req.body.city ?? req.user.city ?? "").trim().slice(0, 80),
      website: String(req.body.website ?? req.user.website ?? "").trim().slice(0, 140),
      statusText: String(req.body.statusText ?? req.user.statusText ?? "Kesifte").trim().slice(0, 80),
      interests: normalizeInterestList(req.body.interests ?? req.user.interests),
      profileTheme: ["lime", "aqua", "amber", "violet"].includes(req.body.profileTheme)
        ? req.body.profileTheme
        : req.user.profileTheme || "lime",
    };

    if (!updates.firstName || !updates.lastName || !updates.avatarName) {
      return res.status(400).json({ message: "Ad, soyad ve avatar adi zorunlu." });
    }

    let user;
    if (!usesDatabase()) {
      user = memoryUsers.find((item) => item.id === req.user.id);
      Object.assign(user, updates);
    } else {
      user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    }

    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("profile update hata:", err);
    return res.status(500).json({ message: "Profil guncellenemedi." });
  }
});

router.post("/me/distance", requireAuth, async (req, res) => {
  const meters = Math.max(0, Number(req.body.meters) || 0);

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
