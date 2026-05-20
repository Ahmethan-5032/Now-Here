const path = require("path");
const { createRequire } = require("module");
const dotenv = require("dotenv");
const serverRequire = createRequire(path.resolve(__dirname, "../server/package.json"));
const bcrypt = serverRequire("bcryptjs");
const mongoose = serverRequire("mongoose");
const User = require("../server/src/models/User");

dotenv.config({ path: path.resolve(__dirname, "../server/.env") });

async function run() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const username = process.env.ADMIN_USERNAME || "Admin";

  if (!process.env.MONGO_URI) throw new Error("MONGO_URI bulunamadi.");
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL ve ADMIN_PASSWORD env degerlerini gir.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const passwordHash = await bcrypt.hash(password, 10);
  await User.findOneAndUpdate(
    { email },
    {
      firstName: "Admin",
      lastName: "User",
      displayName: username,
      avatarName: username,
      email,
      password: passwordHash,
      emailVerified: true,
    },
    { upsert: true, new: true }
  );
  console.log(`${email} icin admin kullanici hazir.`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});
