import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const backendPort = env.BACKEND_PORT || process.env.BACKEND_PORT || "3004"
  const backendUrl =
    env.BACKEND_URL || process.env.BACKEND_URL || `http://localhost:${backendPort}`
  const frontendPort = Number(env.VITE_PORT || process.env.VITE_PORT) || 5174

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      port: frontendPort,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/v1": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/bridge": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/uploads": {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
