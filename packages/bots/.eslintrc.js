const fs = require("fs");
const path = require("path");

const prettierOptions = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./.prettier"), "utf8")
);

module.exports = {
  extends: ["airbnb", "plugin:prettier/recommended", "prettier"],
  plugins: ["babel"],
  ignorePatterns: ["**/contracts/**"],
  rules: {
    "prettier/prettier": ["error", prettierOptions],
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        js: "never",
        ts: "never",
      },
    ],
    "import/prefer-default-export": "off",
    "prefer-destructuring": "off",
    "prefer-template": "off",
    "no-console": "off",
    "func-names": "off",
    "no-await-in-loop": "off",
    "no-plusplus": "off",
  },
};
