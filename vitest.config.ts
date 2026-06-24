import { defineConfig } from 'vitest/config';

// Calculator logic is pure, framework-agnostic TypeScript, so the default
// Node environment is all we need — no DOM, no Astro runtime.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
