import js from "@eslint/js";
import css from "@eslint/css";
import markdown from "@eslint/markdown";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jquery,
        ...globals.es2021,
        "luxon": "readonly"
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn"
    }
  },
  {
    files: ["**/*.css"],
    ...css.configs.recommended,
  },
  {
    files: ["**/*.md"],
    ...markdown.configs.recommended,
  }
];