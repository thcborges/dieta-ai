import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      ADMIN_TOKEN: 'admin-secret-token-key-us-central1',
      BLIND_INDEX_PEPPER: 'test-blind-index-pepper-32chars!!',
      LGPD_SECRET_PEPPER: 'test-blind-index-pepper-32chars!!',
      ADMIN_EMAILS: 'admin@example.com,thcborges@example.com',
    },
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 90,
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.config.*',
        'src/server.ts',
      ],
    },
  },
});
