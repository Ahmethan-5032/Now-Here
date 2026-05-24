const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
const localApiBaseUrl =
  typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
    ? "http://localhost:5000"
    : "";
const API_BASE_URL = (configuredApiBaseUrl || localApiBaseUrl).replace(/\/$/, "");
const MAX_AUTH_TOKEN_LENGTH = 2800;

export function sanitizeStoredSession() {
  const token = localStorage.getItem("token") || "";

  if (token.length > MAX_AUTH_TOKEN_LENGTH) {
    clearStoredSession();
    return "";
  }

  return token;
}

function clearStoredSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function clearClientSession() {
  clearStoredSession();
}

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function request(path, options = {}) {
  const { skipAuth = false, ...fetchOptions } = options;
  const token = skipAuth ? "" : sanitizeStoredSession();
  const headers = {
    ...(fetchOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...fetchOptions.headers,
  };

  let response;

  try {
    response = await fetch(buildUrl(path), {
      ...fetchOptions,
      credentials: "include",
      headers,
    });
  } catch {
    const error = new Error(
      API_BASE_URL
        ? "API sunucusuna ulasilamadi. Render servisinin aktif oldugunu kontrol et."
        : "API adresi tanimli degil. Vercel icin VITE_API_BASE_URL degerini ekle."
    );
    error.isNetworkError = true;
    throw error;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 || response.status === 431) {
      clearStoredSession();
    }

    const error = new Error(
      payload.message ||
        (response.status === 431
          ? "Eski oturum verisi temizlendi. Sayfayi yenileyip tekrar dene."
          : "Istek tamamlanamadi.")
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function requestVerificationCode(payload) {
  return request("/api/auth/request-code", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ email: payload.email }),
  });
}

export async function loginUser(credentials) {
  const payload = {
    email: credentials.email,
    password: credentials.password,
  };

  return request("/api/auth/login", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify(payload),
  });
}

export async function registerUser(details) {
  return request("/api/auth/register", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({
      firstName: details.firstName,
      lastName: details.lastName,
      avatarName: details.avatarName,
      email: details.email,
      password: details.password,
      code: details.code,
      profilePhoto: details.profilePhoto,
    }),
  });
}

export async function fetchProfile() {
  return request("/api/auth/me");
}

export async function updateProfile(payload) {
  return request("/api/auth/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function logoutUser() {
  return request("/api/auth/logout", {
    method: "POST",
    skipAuth: true,
  }).finally(clearStoredSession);
}

export async function recordRouteDistance(meters, routeProof) {
  return request("/api/auth/me/distance", {
    method: "POST",
    body: JSON.stringify({ meters, routeProof }),
  });
}

export async function fetchPosts(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.category && params.category !== "all") query.set("category", params.category);
    if (params.q) query.set("q", params.q);
    const endpoint = `/api/posts${query.toString() ? `?${query}` : ""}`;
    const posts = await request(endpoint);
    return Array.isArray(posts) ? posts : [];
  } catch {
    return [];
  }
}

export async function createPost(post) {
  return request("/api/posts", {
    method: "POST",
    body: JSON.stringify(post),
  });
}

export async function likePost(postId) {
  return request(`/api/posts/${postId}/like`, {
    method: "POST",
  });
}

export async function commentPost(postId, text) {
  return request(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}


export async function deletePost(postId) {
  return request(`/api/posts/${postId}`, {
    method: "DELETE",
  });
}

export async function searchPlaces(query) {
  if (query.trim().length < 2) return [];
  return request(`/api/places/search?q=${encodeURIComponent(query)}`);
}

export async function reverseGeocode(lat, lng) {
  return request(`/api/places/reverse?lat=${lat}&lng=${lng}`);
}

export async function fetchRoute({ fromLat, fromLng, toLat, toLng }) {
  return request(
    `/api/places/route?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`
  );
}
