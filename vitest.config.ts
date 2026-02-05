import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'node', // Default to node, use inline comments for jsdom
        globals: false,
        include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
        exclude: ['**/node_modules/**', '**/dist/**', 'tests/**', 'playwright-report/**', 'test-results/**'],
        deps: {
            // Force these ESM packages to be bundled (fixes jsdom ESM issues)
            optimizer: {
                web: {
                    include: ['@exodus/bytes', 'html-encoding-sniffer']
                }
            }
        },
        // Increase timeout for geometry operations
        testTimeout: 10000,
    },
});
