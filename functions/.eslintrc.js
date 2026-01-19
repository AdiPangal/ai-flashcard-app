module.exports = {
  root: true,
  ignorePatterns: ["lib/**", "node_modules/**", "*.log", "test-outputs/**"],
  env: {
    es6: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }],
    "@typescript-eslint/array-type": ["error", { "default": "array" }],
    "@typescript-eslint/no-require-imports": "off",
    "import/first": "off",
    "no-var": "error",
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
  },
  overrides: [
    {
      files: ["**/*.spec.*", "**/*.test.*"],
      env: {
        mocha: true,
      },
      rules: {
        "@typescript-eslint/no-require-imports": "off",
      },
    },
    {
      files: ["test-pipeline.ts", "list-models.ts"],
      rules: {
        "@typescript-eslint/no-require-imports": "off",
        "import/first": "off",
        "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }],
      },
    },
  ],
  globals: {
    "__dirname": "readonly",
  },
};
