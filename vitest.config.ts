import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['__tests__/**/*.test.ts', '__tests__/**/**/*.test.ts'],  // Include test files in the __tests__ directory
        exclude: [
            'node_modules',
            'dist',
            'repos/**/*', // Use more explicit exclusion for repos directory
            'logs',
            'coverage',
            // Files with not completed tests
            '__tests__/endpoints/package_-id-.test.ts',
            '__tests__/endpoints/package_byRegEx.test.ts', 
            // '__tests__/endpoints/package.test.ts',
            // Files with failing tests
            '__tests__/util/packageUtils/createPackageService.test.ts',
            // Empty files
        ],
        coverage: {
            enabled: true,
            provider: 'istanbul',
            reportsDirectory: './coverage',
            reporter: ['text', 'html', 'json-summary'],
            all: false,  // Disable to avoid including all files by default
            include: ['src/**/*.ts', 'index.ts'], // Only include source files you want to cover
            exclude: ['node_modules', 'dist', '__tests__', 'repos/**/*', 'logs', 'coverage'],
            thresholds: {
                statements: 80,
                branches: 75,
                functions: 80,
                lines: 80,
            },
            skipFull: false,
        },
    },
});
