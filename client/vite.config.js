import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: true,
    modulePreload: false,
    sourcemap: true,
    assetsInlineLimit: 2048,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
