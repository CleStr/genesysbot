import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Langsamen Cold-Start (Import/Transform) abfedern, damit einzelne Tests
    // nicht flaky in den Standard-Timeout laufen.
    testTimeout: 15000,
  },
});
