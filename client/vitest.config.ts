import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // forks-Pool startet auf dieser Umgebung nicht zuverlässig; threads ist hier stabil
    pool: "threads",
  },
});
