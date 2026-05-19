import { createPost } from "../../lib/api";

export async function uploadPost(postData) {
  return createPost(postData);
}
