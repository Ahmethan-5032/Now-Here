const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ""
).replace(/\/$/, "");
const LOCAL_POSTS_KEY = "now-here-local-posts";
const LEGACY_LOCAL_USERS_KEY = "now-here-local-users";
const MAX_AUTH_TOKEN_LENGTH = 2800;

const demoPosts = [
  {
    _id: "local-galata",
    authorId: "",
    authorName: "NOW Here",
    description: "Galata tarafinda hizli bir mola ve sehir manzarasi.",
    lat: 41.0256,
    lng: 28.9742,
    placeName: "Galata",
    image: "",
    category: "doga",
    mood: "calm",
    rating: 4,
    tags: ["manzara", "yuruyus"],
    likes: 12,
    likedBy: [],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    _id: "local-kadikoy",
    authorId: "",
    authorName: "NOW Here",
    description: "Kahve, yuruyus ve kalabalik enerjisi icin guzel bir durak.",
    lat: 40.9909,
    lng: 29.028,
    placeName: "Kadikoy",
    image: "",
    category: "kafe",
    mood: "social",
    rating: 5,
    tags: ["kahve", "sahil"],
    likes: 8,
    likedBy: [],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
];

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

function readStoredJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getLocalPosts() {
  const stored = readStoredJson(LOCAL_POSTS_KEY, []);
  return stored.length ? stored : demoPosts;
}

function setLocalPosts(posts) {
  writeStoredJson(LOCAL_POSTS_KEY, posts);
}

function getStoredUser() {
  return readStoredJson("user", null);
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function findLegacyLocalUser(email) {
  const normalized = normalizeEmail(email);
  const users = readStoredJson(LEGACY_LOCAL_USERS_KEY, []);
  return users.find((user) => normalizeEmail(user.email) === normalized);
}

async function recoverLegacyLocalUser(credentials) {
  const legacyUser = findLegacyLocalUser(credentials.email);

  if (!legacyUser || legacyUser.password !== credentials.password) {
    return null;
  }

  return request("/api/auth/recover-local", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({
      firstName: legacyUser.firstName || "Kullanici",
      lastName: legacyUser.lastName || "Hesabi",
      avatarName: legacyUser.avatarName || legacyUser.displayName || "Gezgin",
      email: legacyUser.email,
      password: credentials.password,
      profilePhoto: legacyUser.profilePhoto || "",
      distanceMeters: legacyUser.distanceMeters || 0,
    }),
  });
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

  try {
    return await request("/api/auth/login", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error.status === 401) {
      const recovered = await recoverLegacyLocalUser(payload);
      if (recovered) return recovered;
    }
    throw error;
  }
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

export async function recordRouteDistance(meters) {
  return request("/api/auth/me/distance", {
    method: "POST",
    body: JSON.stringify({ meters }),
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
    return getLocalPosts();
  }
}

export async function createPost(post) {
  try {
    return await request("/api/posts", {
      method: "POST",
      body: JSON.stringify(post),
    });
  } catch {
    const now = new Date().toISOString();
    const user = getStoredUser() || {};
    const localPost = {
      _id: `local-${Date.now()}`,
      authorId: user.id || "",
      authorName: user.displayName || user.avatarName || "Gezgin",
      authorAvatar: user.avatarName || user.displayName || "gezgin",
      ...post,
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
    };
    const nextPosts = [localPost, ...getLocalPosts()];
    setLocalPosts(nextPosts);
    return localPost;
  }
}

export async function likePost(postId) {
  try {
    return await request(`/api/posts/${postId}/like`, {
      method: "POST",
    });
  } catch {
    const user = getStoredUser() || {};
    const nextPosts = getLocalPosts().map((post) => {
      if (post._id !== postId) return post;
      const likedBy = post.likedBy || [];
      const liked = likedBy.includes(user.id);
      return {
        ...post,
        likedBy: liked ? likedBy.filter((id) => id !== user.id) : [...likedBy, user.id],
        likes: liked ? Math.max(0, (post.likes || 0) - 1) : (post.likes || 0) + 1,
        viewerLiked: !liked,
      };
    });
    setLocalPosts(nextPosts);
    return nextPosts.find((post) => post._id === postId);
  }
}

export async function commentPost(postId, text) {
  try {
    return await request(`/api/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  } catch {
    const user = getStoredUser() || {};
    const now = new Date().toISOString();
    const comment = {
      _id: `comment-${Date.now()}`,
      userId: user.id || "",
      userName: user.displayName || user.avatarName || "Gezgin",
      text,
      createdAt: now,
    };
    const nextPosts = getLocalPosts().map((post) =>
      post._id === postId ? { ...post, comments: [...(post.comments || []), comment], updatedAt: now } : post
    );
    setLocalPosts(nextPosts);
    return nextPosts.find((post) => post._id === postId);
  }
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
