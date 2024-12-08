import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { configDefaults } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        ...configDefaults,
        globals: true,
        environment: "jsdom",
        setupFiles: "./vitest.setup.ts",
    },
});
