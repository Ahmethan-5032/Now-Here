const crypto = require("crypto");
const { getJwtSecret } = require("../config/env");

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload) {
  return crypto.createHmac("sha256", getJwtSecret()).update(payload).digest("base64url");
}

function createRouteProof({ userId, distance, fromLat, fromLng, toLat, toLng }) {
  const payload = {
    userId: String(userId || ""),
    distance: Math.round(Number(distance) || 0),
    fromLat: Number(fromLat).toFixed(5),
    fromLng: Number(fromLng).toFixed(5),
    toLat: Number(toLat).toFixed(5),
    toLng: Number(toLng).toFixed(5),
    expiresAt: Date.now() + 2 * 60 * 60 * 1000,
  };
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${signPayload(encoded)}`;
}

function verifyRouteProof(proof, userId) {
  const [encoded, signature] = String(proof || "").split(".");
  if (!encoded || !signature) return null;

  const expected = signPayload(encoded);
  const validSignature =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!validSignature) return null;

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (String(payload.userId) !== String(userId)) return null;
  if (!payload.expiresAt || payload.expiresAt < Date.now()) return null;
  if (!Number.isFinite(Number(payload.distance)) || Number(payload.distance) <= 0) return null;
  return payload;
}

module.exports = {
  createRouteProof,
  verifyRouteProof,
};
