import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
const backendPort = process.env.BACKEND_PORT || "3004"
const backendUrl = `http://localhost:${backendPort}`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
      },
      "/uploads": {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
})
