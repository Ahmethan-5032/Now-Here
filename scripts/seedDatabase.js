const path = require("path");
const { createRequire } = require("module");
const dotenv = require("dotenv");
const serverRequire = createRequire(path.resolve(__dirname, "../server/package.json"));
const mongoose = serverRequire("mongoose");
const Post = require("../server/src/models/Post");

dotenv.config({ path: path.resolve(__dirname, "../server/.env") });

const seedPosts = [
  {
    description: "Galata tarafinda sehir manzarasi icin guzel durak.",
    lat: 41.0256,
    lng: 28.9742,
    placeName: "Galata",
    category: "doga",
  },
  {
    description: "Kahve ve kisa mola icin enerjisi yuksek bir nokta.",
    lat: 40.9909,
    lng: 29.028,
    placeName: "Kadikoy",
    category: "kafe",
  },
];

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI bulunamadi.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  await Post.insertMany(seedPosts);
  console.log(`${seedPosts.length} demo paylasim eklendi.`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});
