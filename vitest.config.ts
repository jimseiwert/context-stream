import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // Note: @vitejs/plugin-react@6 targets Vite 8, but vitest@3 ships vite-node
  // with Vite 7. We configure esbuild (Vite 7's native transformer) directly
  // with the automatic JSX runtime instead of using the plugin.
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}", "src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
