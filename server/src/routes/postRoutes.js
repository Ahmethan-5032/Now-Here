const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { writeLimiter } = require("../middleware/security");
const {
  getPosts,
  createPost,
  likePost,
  commentPost,
  deletePost,
} = require("../controllers/postController");

const router = express.Router();

router.get("/", requireAuth, getPosts);
router.post("/", requireAuth, writeLimiter, createPost);
router.post("/:id/like", requireAuth, writeLimiter, likePost);
router.post("/:id/comments", requireAuth, writeLimiter, commentPost);
router.delete("/:id", requireAuth, writeLimiter, deletePost);

module.exports = router;
