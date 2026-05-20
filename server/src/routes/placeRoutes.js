const express = require("express");

const router = express.Router();
const userAgent = "NOW-Here/1.0 (local-development)";

function normalizeSearchQuery(query = "") {
  return query
    .trim()
    .replace(/\bburer\b/gi, "burger")
    .replace(/\bburgr\b/gi, "burger")
    .replace(/\bkingg\b/gi, "king")
    .replace(/\bkng\b/gi, "king");
}

function uniquePlaces(places) {
  const seen = new Set();
  return places.filter((place) => {
    const key = `${place.display_name}-${place.lat}-${place.lon}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

router.get("/search", async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (query.length < 2) return res.json([]);

  const queries = Array.from(new Set([query, normalizeSearchQuery(query)]));
  const results = [];

  try {
    for (const currentQuery of queries) {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "8");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("accept-language", "tr");
      url.searchParams.set("countrycodes", "tr");
      url.searchParams.set("q", currentQuery);

      const response = await fetch(url, {
        headers: { "User-Agent": userAgent },
      });
      const data = await response.json();
      if (Array.isArray(data)) results.push(...data);
      if (results.length) break;
    }

    return res.json(uniquePlaces(results).slice(0, 8));
  } catch (err) {
    console.error("place search hata:", err.message);
    return res.status(502).json({ message: "Arama servisine ulasilamadi." });
  }
});

router.get("/reverse", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lng || req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ message: "Gecersiz koordinat." });
    }

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("accept-language", "tr");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));

    const response = await fetch(url, {
      headers: { "User-Agent": userAgent },
    });
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error("reverse hata:", err.message);
    return res.status(502).json({ message: "Adres servisine ulasilamadi." });
  }
});

router.get("/route", async (req, res) => {
  try {
    const fromLat = Number(req.query.fromLat);
    const fromLng = Number(req.query.fromLng);
    const toLat = Number(req.query.toLat);
    const toLng = Number(req.query.toLng);

    if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
      return res.status(400).json({ message: "Gecersiz rota koordinati." });
    }

    const url = new URL(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}`
    );
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("steps", "true");

    const response = await fetch(url);
    const data = await response.json();
    const route = data.routes?.[0];

    if (!route) {
      return res.status(404).json({ message: "Rota bulunamadi." });
    }

    const steps = route.legs
      .flatMap((leg) => leg.steps || [])
      .map((step, index) => ({
        id: `${index}-${step.name || "yol"}`,
        instruction: createInstruction(step),
        name: step.name || "Yol",
        distance: step.distance,
        duration: step.duration,
        maneuver: step.maneuver,
      }));

    return res.json({
      distance: route.distance,
      duration: route.duration,
      positions: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      steps,
    });
  } catch (err) {
    console.error("route hata:", err.message);
    return res.status(502).json({ message: "Rota servisine ulasilamadi." });
  }
});

function createInstruction(step) {
  const road = step.name || "bu yol";
  const distance = formatDistance(step.distance);
  const type = step.maneuver?.type || "";
  const modifier = step.maneuver?.modifier || "";

  if (type === "arrive") return "Varis noktasina ulastin.";
  if (type === "depart") return `${distance} boyunca ${road} uzerinde ilerle.`;
  if (type === "roundabout") return `${distance} sonra donel kavsaga gir ve ${road} yonunu takip et.`;
  if (modifier.includes("left")) return `${distance} sonra sola don ve ${road} uzerinde devam et.`;
  if (modifier.includes("right")) return `${distance} sonra saga don ve ${road} uzerinde devam et.`;
  if (modifier === "straight") return `${distance} boyunca ${road} uzerinde duz devam et.`;
  return `${distance} boyunca ${road} uzerinde ilerle.`;
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "Kisa bir mesafe";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.max(1, Math.round(meters))} m`;
}

module.exports = router;
