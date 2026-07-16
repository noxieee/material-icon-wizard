# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A tool that takes Material icon names (or custom SVGs), verifies/fetches them, rewrites their color to follow CSS `currentColor`, and exports them. It's an **npm-workspaces monorepo** with three packages sharing one logic core:

- `packages/core` — pure, isomorphic JS logic (the important part).
- `packages/cli` — Node CLI. Published to npm as **`material-icon-wizard`** (unscoped).
- `packages/web` — Vue 3 + PrimeVue SPA, deployed to GitHub Pages.

The private root package is named `material-icon-wizard-monorepo` (renamed so the unscoped CLI package could take `material-icon-wizard`). See `PLAN.md` for the full original design and `README.md` for user-facing docs.

## Commands

```bash
npm install                              # install all workspaces
npm test                                 # test every workspace
npm run lint                             # ESLint across the repo
npm run format:check                     # Prettier check (format = write)
npm test -w @material-icon-wizard/core   # test one package (core | @material-icon-wizard/web | material-icon-wizard)
npm test -w @material-icon-wizard/core -- svgTransform   # single test file (vitest name/path filter)
npm run dev -w @material-icon-wizard/web     # web dev server
npm run build -w @material-icon-wizard/web   # web production build -> dist/
npm run build -w material-icon-wizard        # bundle the CLI -> packages/cli/dist/cli.js
node packages/cli/src/cli.js add lock --out ./icons   # run the CLI from source
```

Note the CLI's workspace name is `material-icon-wizard` (not scoped), so target it with `-w material-icon-wizard`.

## Architecture

**`core` is the single source of truth and must stay isomorphic** — the exact same code runs unmodified in Node (CLI) and the browser (web). Concretely: use the global `fetch`, and never import `fs`/`path`/DOM APIs in `core`. Its only runtime dependency is `svgson` (isomorphic SVG parse/serialize); everything else is dependency-free. I/O belongs in `cli`/`web`, which call into `core`.

- `core/svgTransform.js` — `normalizeSvg()` parses the SVG into a tree and applies one rule, **"convert, never introduce"**: an existing `fill`/`stroke` _color_ becomes `currentColor`; `none`/`transparent`/`inherit`/absent are left untouched (so no unwanted fill/outline is added); `url(#…)` gradients are left with a warning. Root `<svg>` gets `fill="currentColor"` only if it had no fill. This one rule is why the same transform is correct for both filled and outlined icons. Serializing from the `<svg>` node drops any prolog/DOCTYPE/comments for free.
- `core/iconSource.js` — fetches Material icons from `@material-icons/svg` over jsDelivr (CORS-open). `getIconManifest()` fetches the flat file listing once → a `Set` of names for instant local existence checks and `searchIcons()`. Style is `round`; version/style are parameters, never hardcoded inline.
- `core/pipeline.js` — `prepareIcon(input, opts)` orchestrates fetch/read → `normalizeSvg` and returns the shared `IconItem` data model (`{ name, source, status, rawSvg, transformedSvg, warnings, errorMessage }`) used by both front ends. Errors are captured as `status: 'error'`, not thrown.

**CLI** (`packages/cli`): single `add` command. `commands/add.js` checks the manifest (typos warn-and-skip, batch continues) then calls `prepareIcon`; `export.js` writes files with TTY-gated conflict handling (`--force` / `--skip-existing`, else prompt on a TTY, else skip-and-warn). For publishing, esbuild bundles `core` + `svgson` into a single self-contained `dist/cli.js` (via `prepublishOnly`), so `core` is a devDependency, not a published runtime dep.

**Web** (`packages/web`): `store.js` is a module-singleton reactive gallery that also persists to `localStorage` (key `miw:selected-icons:v1`). `useIconManifest.js` caches the manifest in `localStorage` keyed by version. `exporter.js` does zip (`fflate`) always plus File System Access folder-write where available. `diffHtml.js` powers the inspector's word-level diff. Components call `prepareIcon` via the store; the shared preview color flows App → gallery → cards as a prop.

## Gotchas learned the hard way

- **Vue store entries must be `reactive()`.** In `store.js`, `blankEntry()` wraps each item in `reactive()`. A plain object pushed into the reactive array updates its data silently but never triggers a re-render, so cards would hang on the pending spinner forever. The `app.test.js` mount test guards this.
- **CI pins Node 22, not 24.** Node 24 ships npm 11, whose `allow-scripts` gating blocks esbuild's postinstall and breaks the vite/vitest build. Node 22 (npm 10) runs install scripts normally. Locally you may hit the same `approve-scripts` prompt — run `npm approve-scripts esbuild`.
- **PrimeVue is pinned to light mode** in `main.js` via `theme.options.darkModeSelector: false` (its default `'system'` clashed with the app's light chrome). Any PrimeVue service/directive (`ConfirmationService`, `Tooltip`, …) registered in `main.js` must **also** be registered in the `app.test.js` mount options, or the test throws.
- **`ICON_VERSION` is defined in two places** — `packages/web/src/config.js` and `DEFAULT_ICON_VERSION` in `packages/cli/src/cli.js`. Bump both. The version is deliberately pinned so upstream icon-set updates can't silently change shipped icons.
- **Publishing the CLI:** bump `packages/cli/package.json` version (npm rejects re-publishing a version), then `npm publish -w material-icon-wizard` (requires an OTP: `--otp=<code>`). The `bin` must include an entry named exactly `material-icon-wizard` (matching the package) or bare `npx material-icon-wizard` fails to resolve the command; `icon-wizard` is kept as a short alias.
- **GitHub Pages base path.** `vite.config.js` hardcodes `base: '/material-icon-wizard/'`, which must match the repo name for asset URLs to resolve. `deploy-web.yml` deploys on push to `main`.

## Conventions

- Commit messages start with a gitmoji (`✨` feature, `🐛` fix, `💄` UI, `📝` docs, `🔧`/`👷` tooling, `✅` tests, `📦` packaging).
- `core`'s Node unit tests are the contract for the deployed web behavior (same `svgson` code path both places) — keep them passing. `web` tests use Vitest + jsdom; `PLAN.md` and generated `dist/` are ignored by Prettier/ESLint.
