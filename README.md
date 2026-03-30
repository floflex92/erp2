# NEXORA truck

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## ERP v1.1 extension (additive)

This codebase now includes an additive `v1.1` extension layer for transport ERP modules:

- tracking
- tachy/driver activity
- routing/traffic
- internal ETA engine
- driver session API
- client portal API
- operations chat API
- AI analysis API

Implementation details are documented in [docs/erp-v1.1-extension.md](docs/erp-v1.1-extension.md).
The data-model foundation and cross-domain views are documented in [docs/logique-base-donnees-socle-metier.md](docs/logique-base-donnees-socle-metier.md).

## OpenRouteService (API gratuite)

Le module `/.netlify/functions/v11-routing` peut maintenant utiliser OpenRouteService en direct (fallback automatique si aucun provider custom n'est configure).

Variables d'environnement serveur a definir:

- `OPENROUTESERVICE_API_KEY` (ou `ORS_API_KEY`) : cle API ORS
- `OPENROUTESERVICE_PROFILE` (optionnel, defaut `driving-hgv`)
- `OPENROUTESERVICE_BASE_URL` (optionnel, defaut `https://api.openrouteservice.org`)

Notes:

- La cle doit rester cote serveur (Netlify env / `.env` local pour Netlify Functions), jamais dans `VITE_*`.
- Profil possible par requete via `options.profile` (ou `profile` en query/body), ex: `driving-hgv`, `driving-car`, `foot-walking`.

## Deployment policy

- Netlify push/deploy is forbidden by default.
- Only run Netlify push/deploy after an explicit user request in the current session.
- Git pushes to Netlify remotes are blocked by `.githooks/pre-push` unless `ALLOW_NETLIFY_PUSH=1` is set.
## Module Tasks et tests

- Nouvelle table `tasks` ajoutée via migration `supabase/migrations/20260330001100_tasks.sql`.
- Nouvelle page React `src/pages/Tasks.tsx` expose tri/filtre/priority/date d'échéance et CRUD Supabase + fallback localStorage.
- Tests E2E-type ajoutés avec `vitest` + `@testing-library/react` dans `src/pages/Tasks.test.tsx`.

### Commandes

- `npm run test` (vitest run)
- `npm run test:watch` (vitest interactive)
Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
