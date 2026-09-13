import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('leaflet')) return 'maps';
          if (id.includes('socket.io') || id.includes('engine.io')) return 'realtime';
          if (id.includes('lucide-react')) return 'icons';
          if (
            id.includes('@base-ui') ||
            id.includes('sonner') ||
            id.includes('class-variance-authority') ||
            id.includes('tailwind-merge') ||
            id.includes('/clsx/')
          ) {
            return 'ui-vendor';
          }
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor';
          }
          return undefined;
        },
      },
    },
  },
})
