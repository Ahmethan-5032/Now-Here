const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");
const placeRoutes = require("./routes/placeRoutes");
const { attachUser } = require("./middleware/auth");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  ...(process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));
app.use(attachUser);

app.get("/", (req, res) => {
  res.json({
    name: "NOW Here API",
    status: "ok",
    storage: app.locals.dbConnected ? "mongodb" : "memory",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    storage: app.locals.dbConnected ? "mongodb" : "memory",
    time: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/places", placeRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Endpoint bulunamadi" });
});

app.use((err, req, res, next) => {
  console.error("API hata:", err);
  res.status(err.status || 500).json({
    message: err.message || "Sunucu hatasi",
  });
});

async function start() {
  app.locals.dbConnected = await connectDB();

  app.listen(PORT, () => {
    const storage = app.locals.dbConnected ? "MongoDB" : "bellek ici yedek";
    console.log(`NOW Here API http://localhost:${PORT} uzerinde calisiyor (${storage})`);
  });
}

start();
