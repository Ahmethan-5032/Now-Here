const DATA_IMAGE_PATTERN = /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i;

function cleanText(value = "", maxLength = 500) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function isEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim().toLowerCase());
}

function normalizeEmail(email = "") {
  return String(email || "").trim().toLowerCase();
}

function validatePassword(password = "") {
  const text = String(password || "");
  if (text.length < 10) return "Sifre en az 10 karakter olmali.";
  if (text.length > 128) return "Sifre 128 karakterden uzun olamaz.";
  if (!/[a-z]/.test(text) || !/[A-Z]/.test(text) || !/\d/.test(text)) {
    return "Sifre en az bir buyuk harf, bir kucuk harf ve bir rakam icermeli.";
  }
  return "";
}

function isSafeDataImage(value = "", maxLength = 900000) {
  if (!value) return true;
  const text = String(value);
  return text.length <= maxLength && DATA_IMAGE_PATTERN.test(text);
}

function parseCoordinate(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

module.exports = {
  cleanText,
  isEmail,
  isSafeDataImage,
  normalizeEmail,
  parseCoordinate,
  validatePassword,
};
