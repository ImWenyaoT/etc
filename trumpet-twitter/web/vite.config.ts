import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@trumpet/shared": new URL("./src/shared.ts", import.meta.url).pathname,
    },
  },
  server: {
    port: 18105,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:18205",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
