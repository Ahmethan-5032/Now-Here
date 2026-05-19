const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const PostSchema = new mongoose.Schema(
  {
    authorId: {
      type: String,
      default: "",
      index: true,
    },
    authorName: {
      type: String,
      trim: true,
      default: "Gezgin",
    },
    authorAvatar: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    placeName: {
      type: String,
      trim: true,
      default: "Konum",
      maxlength: 160,
    },
    image: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: ["genel", "diger", "kafe", "doga", "etkinlik", "spor", "sanat", "yemek", "alisveris"],
      default: "genel",
      index: true,
    },
    mood: {
      type: String,
      enum: ["calm", "social", "focus", "energy", "view"],
      default: "calm",
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
      validate: [(value) => value.length <= 6, "En fazla 6 etiket eklenebilir."],
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    likedBy: {
      type: [String],
      default: [],
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
  },
  { timestamps: true }
);

PostSchema.index({ createdAt: -1 });
PostSchema.index({ placeName: "text", description: "text", tags: "text", authorName: "text" });

module.exports = mongoose.model("Post", PostSchema);
