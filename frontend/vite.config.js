import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port 5500 is one of the origins the backend's CORS settings allow (Backend/main.py).
export default defineConfig({
  plugins: [react()],
  server: { port: 5500, strictPort: true },
  preview: { port: 5500, strictPort: true },
  test: { environment: "jsdom" },
});
