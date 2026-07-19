import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            'verb-nurbs': fileURLToPath(
                new URL('./vendor/verb-nurbs/build/verb.es.js', import.meta.url),
            ),
        },
    },
    test: {
        environment: 'node', // Default to node, use inline comments for jsdom
        globals: false,
        setupFiles: ['./tests/vitest.setup.ts'],
        include: [
            'src/**/*.test.{ts,tsx}',
            'scripts/**/*.test.ts',
            'src/**/*.spec.{ts,tsx}',
            'tests/unit/**/*.test.{ts,tsx}',
            'tests/funnel/**/*.test.{ts,tsx}',
            'tests/e2e/**/*.test.ts',
            'tests/integration/**/*.test.ts',
            'tests/integration/studio/**/*.test.tsx',
            'eval/**/*.test.ts',
            'scripts/**/*.test.ts',
            'site/functions/**/*.test.ts',
            'site/scripts/**/*.test.ts',
            // Without this the island tests are collected by nothing and report
            // no failures because they never run.
            'site/island/**/*.test.ts',
        ],
        exclude: ['**/node_modules/**', '**/dist/**', 'tests/playwright/**', 'playwright-report/**', 'test-results/**'],
        deps: {
            // Force these ESM packages to be bundled (fixes jsdom ESM issues)
            optimizer: {
                web: {
                    include: ['@exodus/bytes', 'html-encoding-sniffer']
                }
            }
        },
        testTimeout: 60000,
    },
});
