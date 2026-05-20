import { useEffect, useState } from "react";
import { fetchPosts } from "../lib/api";

export default function usePosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    fetchPosts().then((nextPosts) => {
      if (!alive) return;
      setPosts(nextPosts);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, []);

  return { posts, setPosts, loading };
}
