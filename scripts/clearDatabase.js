const path = require("path");
const { createRequire } = require("module");
const dotenv = require("dotenv");
const serverRequire = createRequire(path.resolve(__dirname, "../server/package.json"));
const mongoose = serverRequire("mongoose");
const Post = require("../server/src/models/Post");
const User = require("../server/src/models/User");

dotenv.config({ path: path.resolve(__dirname, "../server/.env") });

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI bulunamadi.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const [posts, users] = await Promise.all([Post.deleteMany({}), User.deleteMany({})]);
  console.log(`${posts.deletedCount} post ve ${users.deletedCount} kullanici silindi.`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});
