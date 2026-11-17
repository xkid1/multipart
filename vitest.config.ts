import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Mirror tsconfig.json "paths" (one alias per layer barrel).
const fromRoot = (file: string) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  resolve: {
    // Exact-match regexes: a plain '@types' key would also capture '@types/*' packages.
    alias: (
      [
        ['@types', './src/types/index.ts'],
        ['@libs', './src/libs/index.ts'],
        ['@utils', './src/utils/index.ts'],
        ['@middleware', './src/middleware/index.ts'],
        ['@storage', './src/storage/index.ts'],
      ] as const
    ).map(([alias, file]) => ({
      find: new RegExp(`^${alias}$`),
      replacement: fromRoot(file),
    })),
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
        'src/storage/shared/index.ts',
        'src/types/middleware/request.ts',
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
