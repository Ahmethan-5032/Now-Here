const crypto = require("crypto");

const PLACEHOLDER_SECRET_PATTERN = /^(change-this|your-|xxxx|xkeysib-xxxx|now-here-development-secret)/i;
const DEV_JWT_SECRET = crypto
  .createHash("sha256")
  .update("now-here-local-development-only")
  .digest("hex");

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function isStrongSecret(value, minLength = 32) {
  const text = String(value || "").trim();
  return text.length >= minLength && !PLACEHOLDER_SECRET_PATTERN.test(text);
}

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();

  if (isStrongSecret(secret, 32)) {
    return secret;
  }

  if (isProduction()) {
    throw new Error(
      "Guvenlik hatasi: production ortaminda JWT_SECRET en az 32 karakterlik rastgele bir secret olmali."
    );
  }

  console.warn("JWT_SECRET zayif veya placeholder. Sadece yerel gelistirme icin gecici secret kullaniliyor.");
  return DEV_JWT_SECRET;
}

function getAllowedOrigins() {
  const configured = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const developmentOrigins = isProduction()
    ? []
    : ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"];

  return Array.from(new Set([...developmentOrigins, ...configured]));
}

function validateSecurityEnv() {
  getJwtSecret();

  if (isProduction()) {
    if (!process.env.MONGO_URI) {
      throw new Error("Guvenlik hatasi: production ortaminda MONGO_URI zorunlu. Bellek ici mod kapali.");
    }

    if (!getAllowedOrigins().length) {
      throw new Error("Guvenlik hatasi: production ortaminda CLIENT_ORIGIN veya CLIENT_ORIGINS zorunlu.");
    }
  }
}

module.exports = {
  getAllowedOrigins,
  getJwtSecret,
  isProduction,
  validateSecurityEnv,
};
