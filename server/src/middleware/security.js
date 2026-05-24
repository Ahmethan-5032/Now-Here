const crypto = require("crypto");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { isProduction } = require("../config/env");

const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeOrigin(origin = "") {
  return String(origin).trim().replace(/\/$/, "");
}

function createRateLimit({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });
}

function requestId(req, res, next) {
  req.id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(12).toString("hex");
  res.setHeader("X-Request-Id", req.id);
  next();
}

function rejectBadKeys(value, depth = 0) {
  if (depth > 12) {
    const error = new Error("Istek govdesi cok derin.");
    error.status = 400;
    throw error;
  }

  if (Array.isArray(value)) {
    if (value.length > 80) {
      const error = new Error("Istek listesi cok uzun.");
      error.status = 400;
      throw error;
    }
    value.forEach((item) => rejectBadKeys(item, depth + 1));
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".") || BLOCKED_KEYS.has(key)) {
      const error = new Error("Gecersiz istek alani.");
      error.status = 400;
      throw error;
    }
    rejectBadKeys(value[key], depth + 1);
  }
}

function stripControlCharacters(value) {
  if (typeof value === "string") {
    return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  }

  if (Array.isArray(value)) {
    return value.map(stripControlCharacters);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, stripControlCharacters(item)])
    );
  }

  return value;
}

function sanitizeRequest(req, res, next) {
  try {
    rejectBadKeys(req.body);
    rejectBadKeys(req.query);
    req.body = stripControlCharacters(req.body);
    next();
  } catch (error) {
    next(error);
  }
}

function createOriginGuard(allowedOrigins) {
  const allowed = new Set(allowedOrigins.map(normalizeOrigin));

  return function originGuard(req, res, next) {
    if (!UNSAFE_METHODS.has(req.method)) return next();

    const origin = normalizeOrigin(req.headers.origin || "");
    const referer = normalizeOrigin(req.headers.referer || "");
    let refererOrigin = "";
    try {
      refererOrigin = referer ? new URL(referer).origin : "";
    } catch {
      refererOrigin = "";
    }
    const candidate = origin || normalizeOrigin(refererOrigin);

    if (!candidate && !isProduction()) return next();
    if (candidate && allowed.has(candidate)) return next();

    return res.status(403).json({ message: "Guvenlik nedeniyle istek kaynagi reddedildi." });
  };
}

function applySecurity(app, allowedOrigins) {
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(requestId);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
      hsts: isProduction()
        ? {
            maxAge: 15552000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    })
  );
  app.use(createOriginGuard(allowedOrigins));
}

const globalLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: "Cok fazla istek gonderildi. Biraz sonra tekrar dene.",
});

const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Cok fazla giris denemesi yapildi. Biraz sonra tekrar dene.",
});

const verificationLimiter = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: "Cok fazla dogrulama kodu istendi. Biraz sonra tekrar dene.",
});

const writeLimiter = createRateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: "Cok hizli islem yapiliyor. Lutfen biraz bekle.",
});

module.exports = {
  applySecurity,
  authLimiter,
  globalLimiter,
  sanitizeRequest,
  verificationLimiter,
  writeLimiter,
};
