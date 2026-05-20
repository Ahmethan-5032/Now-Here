const now = Date.now();

const memoryUsers = [];
const verificationCodes = new Map();

const memoryPosts = [
  {
    _id: "demo-galata",
    authorId: "",
    authorName: "NOW Here",
    authorAvatar: "gezgin",
    description: "Galata civarinda guzel bir yuruyus noktasi.",
    lat: 41.0256,
    lng: 28.9742,
    placeName: "Galata",
    image: "",
    category: "doga",
    mood: "view",
    rating: 4,
    tags: ["manzara", "yuruyus"],
    likes: 12,
    likedBy: [],
    comments: [],
    createdAt: new Date(now - 1000 * 60 * 24).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 24).toISOString(),
  },
  {
    _id: "demo-kadikoy",
    authorId: "",
    authorName: "NOW Here",
    authorAvatar: "rota",
    description: "Kahve, sohbet ve deniz havasi icin iyi durak.",
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
    createdAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
  },
];

module.exports = {
  memoryUsers,
  memoryPosts,
  verificationCodes,
};
