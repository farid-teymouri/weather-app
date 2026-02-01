/**
 * ESLint Configuration
 * JavaScript code quality and style rules
 */

export default {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ["eslint:recommended", "prettier"],
  overrides: [],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["jsdoc"],
  rules: {
    // Strict mode
    strict: ["error", "global"],

    // Variables
    "no-unused-vars": [
      "error",
      {
        args: "after-used",
        ignoreRestSiblings: true,
      },
    ],
    "no-undef": "error",
    "no-shadow": "error",

    // Best practices
    eqeqeq: ["error", "always"],
    curly: ["error", "multi-line"],
    "dot-notation": "error",
    "no-alert": "warn",
    "no-console": "off",
    "no-constant-condition": "warn",
    "no-empty": ["error", { allowEmptyCatch: true }],
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-wrappers": "error",
    "no-return-await": "error",
    "no-self-compare": "error",
    "no-sequences": "error",
    "no-throw-literal": "error",
    "no-unused-expressions": "error",
    "no-useless-call": "error",
    "no-useless-concat": "error",
    "no-useless-return": "error",
    "no-void": "error",
    "prefer-promise-reject-errors": "error",
    "require-await": "error",
    "wrap-iife": ["error", "inside"],

    // Stylistic issues
    "array-bracket-spacing": ["error", "never"],
    "block-spacing": ["error", "always"],
    "brace-style": ["error", "1tbs", { allowSingleLine: true }],
    "comma-dangle": ["error", "always-multiline"],
    "comma-spacing": ["error", { before: false, after: true }],
    "comma-style": ["error", "last"],
    "computed-property-spacing": ["error", "never"],
    "eol-last": ["error", "always"],
    "func-call-spacing": ["error", "never"],
    indent: [
      "error",
      4,
      {
        SwitchCase: 1,
        flatTernaryExpressions: true,
      },
    ],
    "key-spacing": ["error", { beforeColon: false, afterColon: true }],
    "keyword-spacing": ["error", { before: true, after: true }],
    "linebreak-style": ["error", "unix"],
    "lines-between-class-members": ["error", "always"],
    "max-len": [
      "error",
      {
        code: 120,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],
    "new-cap": ["error", { newIsCap: true, capIsNew: false }],
    "new-parens": "error",
    "no-array-constructor": "error",
    "no-lonely-if": "error",
    "no-mixed-operators": "error",
    "no-mixed-spaces-and-tabs": "error",
    "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
    "no-new-object": "error",
    "no-trailing-spaces": "error",
    "no-whitespace-before-property": "error",
    "object-curly-spacing": ["error", "always"],
    "operator-linebreak": ["error", "after"],
    "quote-props": ["error", "as-needed"],
    quotes: [
      "error",
      "single",
      { avoidEscape: true, allowTemplateLiterals: true },
    ],
    semi: ["error", "always"],
    "semi-spacing": ["error", { before: false, after: true }],
    "space-before-blocks": ["error", "always"],
    "space-before-function-paren": [
      "error",
      {
        anonymous: "always",
        named: "never",
        asyncArrow: "always",
      },
    ],
    "space-in-parens": ["error", "never"],
    "space-infix-ops": "error",
    "space-unary-ops": [
      "error",
      {
        words: true,
        nonwords: false,
        overrides: { typeof: false },
      },
    ],
    "spaced-comment": [
      "error",
      "always",
      {
        line: { markers: ["/", "*"] },
        block: { balanced: true },
      },
    ],

    // ES6
    "arrow-spacing": ["error", { before: true, after: true }],
    "no-confusing-arrow": ["error", { allowParens: true }],
    "no-useless-computed-key": "error",
    "no-useless-rename": "error",
    "no-var": "error",
    "object-shorthand": ["error", "always"],
    "prefer-arrow-callback": "error",
    "prefer-const": ["error", { destructuring: "all" }],
    "prefer-destructuring": [
      "error",
      {
        VariableDeclarator: { array: false, object: true },
        AssignmentExpression: { array: false, object: false },
      },
    ],
    "prefer-numeric-literals": "error",
    "prefer-rest-params": "error",
    "prefer-spread": "error",
    "prefer-template": "error",
    "rest-spread-spacing": ["error", "never"],
    "template-curly-spacing": ["error", "never"],
    "yield-star-spacing": ["error", "both"],

    // JSDoc
    "jsdoc/check-alignment": "error",
    "jsdoc/check-param-names": "error",
    "jsdoc/check-tag-names": "error",
    "jsdoc/check-types": "error",
    "jsdoc/newline-after-description": "error",
    "jsdoc/require-description": "error",
    "jsdoc/require-description-complete-sentence": "off",
    "jsdoc/require-hyphen-before-param-description": "off",
    "jsdoc/require-param": "error",
    "jsdoc/require-param-description": "error",
    "jsdoc/require-param-name": "error",
    "jsdoc/require-param-type": "error",
    "jsdoc/require-returns": "error",
    "jsdoc/require-returns-check": "error",
    "jsdoc/require-returns-description": "error",
    "jsdoc/require-returns-type": "error",
    "jsdoc/tag-lines": "error",

    // Security
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-script-url": "error",
    "no-sequences": "error",
  },
};
