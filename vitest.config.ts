import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@utils': fileURLToPath(new URL('./src/utils/index.ts', import.meta.url)),
      '@libs': fileURLToPath(new URL('./src/libs/index.ts', import.meta.url)),
      '@middleware': fileURLToPath(new URL('./src/middleware/index.ts', import.meta.url)),
      '@storage': fileURLToPath(new URL('./src/storage/index.ts', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.{test,spec}.ts', 'test/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    testTimeout: 5_000,
    hookTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/index.ts',
        'src/libs/index.ts',
        'src/middleware/index.ts',
        'src/storage/index.ts',
        'src/storage/*/index.ts',
        'src/utils/index.ts',
        'src/utils/*/index.ts',
        'src/server.ts',
        'src/**/migrations/**',
        'src/**/types/**',
      ],
      // Start modest, then ratchet up as coverage grows.
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 75,
        statements: 95,
      },
    },
  },
});
