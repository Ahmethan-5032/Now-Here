const crypto = require("crypto");
const mongoose = require("mongoose");
const Post = require("../models/Post");
const { memoryPosts } = require("../data/memoryStore");
const { cleanText, isSafeDataImage, parseCoordinate } = require("../utils/validation");

const validCategories = new Set(["genel", "diger", "kafe", "doga", "etkinlik", "spor", "sanat", "yemek", "alisveris"]);
const validMoods = new Set(["calm", "social", "focus", "energy", "view"]);

function usesDatabase() {
  return mongoose.connection.readyState === 1;
}

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function normalizeTags(tags) {
  const source = Array.isArray(tags) ? tags : String(tags || "").split(",");
  return Array.from(
    new Set(
      source
        .map((tag) => cleanText(tag, 24).replace(/^#/, "").toLowerCase())
        .filter((tag) => /^[a-z0-9ğüşöçı._-]{2,24}$/i.test(tag))
    )
  ).slice(0, 6);
}

function isValidPostId(id) {
  const text = String(id || "");
  return /^[a-zA-Z0-9._:-]{1,80}$/.test(text) && (!usesDatabase() || mongoose.Types.ObjectId.isValid(text));
}

function normalizePost(post, viewerId = "") {
  const source = typeof post.toObject === "function" ? post.toObject() : post;
  const likedBy = source.likedBy || [];

  return {
    _id: String(source._id),
    authorId: source.authorId || "",
    authorName: source.authorName || "Gezgin",
    authorAvatar: source.authorAvatar || "",
    description: source.description || "",
    lat: Number(source.lat),
    lng: Number(source.lng),
    placeName: source.placeName || "Konum",
    image: source.image || "",
    category: source.category || "genel",
    mood: source.mood || "calm",
    rating: Number(source.rating) || 0,
    tags: normalizeTags(source.tags),
    likes: Number(source.likes) || likedBy.length || 0,
    likedBy,
    viewerLiked: viewerId ? likedBy.includes(viewerId) : false,
    comments: source.comments || [],
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function validatePostInput({ description = "", image = "", lat, lng, tags = [] }) {
  const numericLat = parseCoordinate(lat, -90, 90);
  const numericLng = parseCoordinate(lng, -180, 180);

  if (!description.trim() && !image) {
    return "Aciklama veya fotograf eklemelisin.";
  }

  if (description.length > 500) {
    return "Aciklama 500 karakterden uzun olamaz.";
  }

  if (normalizeTags(tags).join(",").length > 120) {
    return "Etiketler cok uzun.";
  }

  if (!isSafeDataImage(image || "")) {
    return "Fotograf yalnizca png, jpg veya webp ve 900KB alti olmali.";
  }

  if (
    numericLat === null ||
    numericLng === null
  ) {
    return "Gecersiz konum.";
  }

  return null;
}

function filterPosts(posts, req) {
  const category = cleanText(req.query.category, 24);
  const q = cleanText(req.query.q, 80).toLowerCase();

  return posts.filter((post) => {
    if (category && category !== "all" && post.category !== category) return false;
    if (!q) return true;

    const haystack = [
      post.placeName,
      post.description,
      post.authorName,
      post.category,
      post.mood,
      ...(post.tags || []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

exports.getPosts = async (req, res) => {
  try {
    if (!usesDatabase()) {
      const posts = memoryPosts.map((post) => normalizePost(post, req.user?.id)).sort(sortNewest);
      return res.json(filterPosts(posts, req));
    }

    const mongoFilter = {};
    const category = String(req.query.category || "").trim();
    if (category && category !== "all" && validCategories.has(category)) mongoFilter.category = category;

    const posts = await Post.find(mongoFilter).sort({ createdAt: -1 });
    return res.json(filterPosts(posts.map((post) => normalizePost(post, req.user?.id)), req));
  } catch (err) {
    console.error("getPosts hata:", err);
    return res.status(500).json({ message: "Postlar alinamadi" });
  }
};

exports.createPost = async (req, res) => {
  try {
    const {
      description = "",
      lat,
      lng,
      placeName = "Konum",
      image = "",
      category = "genel",
      mood = "calm",
      rating = 0,
      tags = [],
    } = req.body;

    const validationError = validatePostInput({ description, image, lat, lng, tags });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const payload = {
      authorId: req.user.id,
      authorName: req.user.displayName || req.user.avatarName || "Gezgin",
      authorAvatar: req.user.avatarName || "",
      description: cleanText(description, 500),
      lat: Number(lat),
      lng: Number(lng),
      placeName: cleanText(placeName, 160) || "Konum",
      image,
      category: validCategories.has(cleanText(category, 24)) ? cleanText(category, 24) : "genel",
      mood: validMoods.has(cleanText(mood, 24)) ? cleanText(mood, 24) : "calm",
      rating: Math.max(0, Math.min(5, Number(rating) || 0)),
      tags: normalizeTags(tags),
      likedBy: [],
      likes: 0,
      comments: [],
    };

    if (!usesDatabase()) {
      const now = new Date().toISOString();
      const post = {
        _id: createId(),
        ...payload,
        createdAt: now,
        updatedAt: now,
      };
      memoryPosts.unshift(post);
      return res.status(201).json(normalizePost(post, req.user.id));
    }

    const post = await Post.create(payload);
    return res.status(201).json(normalizePost(post, req.user.id));
  } catch (err) {
    console.error("createPost hata:", err);
    return res.status(500).json({ message: "Post olusturulamadi" });
  }
};

exports.likePost = async (req, res) => {
  try {
    if (!isValidPostId(req.params.id)) {
      return res.status(400).json({ message: "Gecersiz post id." });
    }

    if (!usesDatabase()) {
      const post = memoryPosts.find((item) => item._id === req.params.id);
      if (!post) return res.status(404).json({ message: "Post bulunamadi" });

      const likedBy = post.likedBy || [];
      const liked = likedBy.includes(req.user.id);
      post.likedBy = liked ? likedBy.filter((id) => id !== req.user.id) : [...likedBy, req.user.id];
      post.likes = liked ? Math.max(0, (post.likes || 0) - 1) : (post.likes || 0) + 1;
      post.updatedAt = new Date().toISOString();
      return res.json(normalizePost(post, req.user.id));
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post bulunamadi" });

    const liked = post.likedBy.includes(req.user.id);
    if (liked) {
      post.likedBy = post.likedBy.filter((id) => id !== req.user.id);
      post.likes = Math.max(0, post.likes - 1);
    } else {
      post.likedBy.push(req.user.id);
      post.likes += 1;
    }

    await post.save();
    return res.json(normalizePost(post, req.user.id));
  } catch (err) {
    console.error("likePost hata:", err);
    return res.status(500).json({ message: "Begeni islemi basarisiz" });
  }
};

exports.commentPost = async (req, res) => {
  try {
    if (!isValidPostId(req.params.id)) {
      return res.status(400).json({ message: "Gecersiz post id." });
    }

    const text = cleanText(req.body.text, 300);
    if (text.length < 2) {
      return res.status(400).json({ message: "Yorum en az 2 karakter olmali." });
    }
    if (text.length > 300) {
      return res.status(400).json({ message: "Yorum 300 karakterden uzun olamaz." });
    }

    const comment = {
      _id: createId(),
      userId: req.user.id,
      userName: req.user.displayName || req.user.avatarName || "Gezgin",
      text,
      createdAt: new Date(),
    };

    if (!usesDatabase()) {
      const post = memoryPosts.find((item) => item._id === req.params.id);
      if (!post) return res.status(404).json({ message: "Post bulunamadi" });
      post.comments = [...(post.comments || []), comment];
      post.updatedAt = new Date().toISOString();
      return res.status(201).json(normalizePost(post, req.user.id));
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post bulunamadi" });
    post.comments.push(comment);
    await post.save();
    return res.status(201).json(normalizePost(post, req.user.id));
  } catch (err) {
    console.error("commentPost hata:", err);
    return res.status(500).json({ message: "Yorum eklenemedi" });
  }
};

exports.deletePost = async (req, res) => {
  try {
    if (!isValidPostId(req.params.id)) {
      return res.status(400).json({ message: "Gecersiz post id." });
    }

    if (!usesDatabase()) {
      const index = memoryPosts.findIndex((item) => item._id === req.params.id);
      if (index === -1) return res.status(404).json({ message: "Post bulunamadi" });
      if (memoryPosts[index].authorId !== req.user.id) {
        return res.status(403).json({ message: "Bu postu silme yetkin yok." });
      }
      memoryPosts.splice(index, 1);
      return res.json({ ok: true });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post bulunamadi" });
    if (post.authorId !== req.user.id) {
      return res.status(403).json({ message: "Bu postu silme yetkin yok." });
    }
    await post.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    console.error("deletePost hata:", err);
    return res.status(500).json({ message: "Post silinemedi" });
  }
};

function sortNewest(a, b) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
