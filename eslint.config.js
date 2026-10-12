/**
 * Flat config — o formato exigido do ESLint 9 em diante (aqui rodamos o 10).
 *
 * Substitui o `.eslintrc.cjs`, que o ESLint 10 nem lê: sem este arquivo o
 * `npm run lint` morria com "couldn't find an eslint.config.(js|mjs|cjs)".
 * As dependências de flat config já estavam todas no package.json — só o
 * arquivo não tinha sido migrado.
 *
 * Atenção: no eslint-plugin-react-hooks v7 os presets flat ficam sob `configs.flat`.
 * Os da raiz (`configs.recommended`, `configs["recommended-latest"]`) ainda são
 * do formato antigo — declaram `plugins` como array de strings, e o ESLint 10
 * rejeita com "plugins key defined as an array of strings".
 */

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "**/*.tsbuildinfo", "vite.config.js", "vite.config.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  reactRefresh.configs.vite,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // O service worker roda fora da página: `self`, `caches`, `clients` são do
  // escopo dele, não de `window`.
  {
    files: ["public/sw.js"],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
);
