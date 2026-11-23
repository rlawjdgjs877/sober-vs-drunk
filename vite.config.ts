import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  base: "./", // GitHub Pages 하위 경로에서도 동작하도록 상대 경로 사용
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
