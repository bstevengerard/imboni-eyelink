import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const PROXY_TARGET = "https://imboni-eyelink-backend.onrender.com";

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        // Avoid CORS during dev by routing API through Vite
        "/api": {
          target: PROXY_TARGET,
          changeOrigin: true,
        },
        "/uploads": {
          target: PROXY_TARGET,
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
