// eslint.config.js
import typescriptParser from "@typescript-eslint/parser";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";

export default [
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: typescriptParser,
        },
        plugins: {
            "@typescript-eslint": typescriptPlugin,
        },
        rules: {
            "@typescript-eslint/no-unused-vars": "warn",
        },
    },
];
