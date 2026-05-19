const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 60,
    },
    lastName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 60,
    },
    displayName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 60,
    },
    avatarName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 36,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    profilePhoto: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 220,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    website: {
      type: String,
      trim: true,
      maxlength: 140,
      default: "",
    },
    statusText: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "Kesifte",
    },
    interests: {
      type: [String],
      default: [],
      validate: [(value) => value.length <= 8, "En fazla 8 ilgi alani eklenebilir."],
    },
    profileTheme: {
      type: String,
      enum: ["lime", "aqua", "amber", "violet"],
      default: "lime",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    distanceMeters: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
