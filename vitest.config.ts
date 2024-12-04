import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['__tests__/**/*.test.ts'],  // Include test files in the __tests__ directory
        exclude: [
            'node_modules',
            'dist',
            'repos/**/*', // Use more explicit exclusion for repos directory
            'logs',
            'coverage',
            // Exclude specific test files for not implemented endpoints
            '__tests__/endpoints/packages.test.ts',
            '__tests__/endpoints/package_-id-_cost.test.ts',
            '__tests__/endpoints/package_-id-.test.ts',
            '__tests__/endpoints/reset.test.ts',
            '__tests__/endpoints/package_byRegEx.test.ts', 
        ],
        coverage: {
            enabled: true,
            provider: 'istanbul',
            reportsDirectory: './coverage',
            reporter: ['text', 'html', 'json-summary'],
            all: false,  // Disable to avoid including all files by default
            include: ['src/**/*.ts'], // Only include source files you want to cover
            exclude: ['node_modules', 'dist', '__tests__', 'repos/**/*', 'logs', 'coverage'],
            thresholds: {
                statements: 80,
                branches: 75,
                functions: 80,
                lines: 80,
            },
        },
    },
});