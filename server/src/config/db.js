const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI tanimli degil. API bellek ici yedek modda calisacak.");
    return false;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB baglantisi hazir: ${mongoose.connection.name}`);
    return true;
  } catch (err) {
    console.warn("MongoDB baglanamadi. API bellek ici yedek modda calisacak.");
    console.warn(err.message);
    console.warn("Atlas kullaniyorsan Database Access kullanicisini ve Network Access IP iznini kontrol et.");
    return false;
  }
};

module.exports = connectDB;
