# Material Icon Wizard

Take Material icon names (or your own custom SVGs), verify they exist, preview
them, normalize their color to follow CSS `currentColor`, and export them to a
project folder. Two front ends share one logic core:

- a **CLI tool** (Node.js) for scripted/local use
- a **web app** (Vue 3 + PrimeVue, hosted on GitHub Pages) for a GUI, usable
  from any machine with no install

This replaces the old manual workflow (search fonts.google.com → download SVG →
run a regex shell script → copy into the project).

### ▶️ [Open the live app](https://noxieee.github.io/material-icon-wizard/)

<https://noxieee.github.io/material-icon-wizard/>

> **Status:** all packages (`core`, `cli`, `web`) are implemented and tested,
> and CI/CD workflows are in place. See [`PLAN.md`](./PLAN.md) for the full
> design and [roadmap](#roadmap).

## Repository layout

This is a single git repository using **npm workspaces** — all packages live
here and are committed together.

```
material-icon-wizard/
  packages/
    core/   # pure, isomorphic JS — shared logic
    cli/    # Node CLI, depends on core — published to npm as material-icon-wizard
    web/    # Vue 3 + PrimeVue app, depends on core — deployed to GitHub Pages
  PLAN.md   # full design document
```

## The `core` package

`core` is **isomorphic** — the same code runs unmodified in Node (the CLI) and
in the browser (the web app). It uses the global `fetch` API and avoids any
`fs`/`path`/DOM access. Its only runtime dependency is
[`svgson`](https://www.npmjs.com/package/svgson), a small pure-JS SVG
parser/serializer.

### What it does

- **Icon source** — Material Icons (classic fixed-weight `round` style) are
  fetched from the [`@material-icons/svg`](https://www.npmjs.com/package/@material-icons/svg)
  package over jsDelivr (CORS-open). The package version is pinned by the caller
  so an upstream update can't silently change already-shipped icons.
- **Existence check** — the flat file listing is fetched once and reduced to a
  `Set` of valid icon names, so checks and search are instant local lookups.
  Callers cache this manifest keyed by version.
- **Transform (`normalizeSvg`)** — parses the SVG into a real tree and rewrites
  paint so the icon follows the consumer's CSS `color`. The single rule is
  **convert, never introduce**: every existing `fill`/`stroke` _color_ becomes
  `currentColor`; `none`/`transparent`/`inherit` and absent paints are left
  untouched (so no unwanted fill or outline appears); `url(#…)` gradient paints
  are left as-is and flagged as a warning. This one rule is correct for both
  filled and outlined icons without detecting which is which. Serializing from
  the `<svg>` node also drops any XML prolog, DOCTYPE, or leading comments.

### Public API

```js
import {
  getIconUrl, // (name, version, style='round') -> url string
  getIconManifest, // async (version, style='round') -> Set<string>
  iconExists, // (name, manifest) -> boolean
  downloadIconSvg, // async (url) -> string
  searchIcons, // (query, manifest, limit=20) -> string[]  (local, ranked)
  normalizeSvg, // async (svgText) -> { svg, warnings }
  prepareIcon, // async (input, opts) -> IconItem  (fetch/read -> transform)
} from '@material-icon-wizard/core';
```

`prepareIcon` returns the shared data model used by both front ends:

```js
{
  name: string,
  source: 'material' | 'custom',
  status: 'pending' | 'found' | 'missing' | 'error',
  rawSvg: string | null,          // untouched original
  transformedSvg: string | null,  // output of normalizeSvg()
  warnings: string[],
  errorMessage: string | null,
}
```

## CLI (`packages/cli`)

Published on npm as
[**`material-icon-wizard`**](https://www.npmjs.com/package/material-icon-wizard).
Non-interactive and scriptable. Add Material icons by name and/or custom SVGs by
path; each is normalized to `currentColor` and written to `--out`.

```bash
# no install needed
npx material-icon-wizard add lock lock_open menu --out ./src/assets/icons
npx material-icon-wizard add --file ./my-icon.svg --out ./src/assets/icons

# or install globally for the `icon-wizard` command
npm install -g material-icon-wizard
icon-wizard add lock lock_open menu --out ./src/assets/icons
```

The published package is a single self-contained bundle (core + `svgson` inlined
via esbuild). From a checkout you can also run it directly:
`node packages/cli/src/cli.js add …`.

- Unknown Material names print a warning to stderr and are skipped; the batch
  continues.
- **Conflicts:** an interactive terminal gets one batch confirmation before
  overwriting; `--force` overwrites, `--skip-existing` keeps existing files. A
  non-interactive run (pipe/CI) with neither flag skips-and-warns rather than
  hanging on a prompt.
- `--print` (alias `--verbose`) dumps raw and transformed source per icon;
  `--no-transform` emits the raw SVG untouched. Run with `--help` for all flags.

## Web app (`packages/web`)

Vue 3 + PrimeVue single-page app (Vite), meant for GitHub Pages. Same feature
set as the CLI in a GUI:

- **Search & add** — a type-ahead (`AutoComplete`) backed by the cached
  manifest; suggestions show CDN thumbnails, clicking one adds it to the
  gallery. Only ever suggests names that exist.
- **Custom upload** — pick `.svg` files; they run through the same
  normalization pipeline as Material icons.
- **Gallery** — each icon rendered inline as real DOM SVG, with a status badge,
  a warnings badge, and remove / re-transform / inspect actions.
- **Color verification** — per-card swatches and a native color picker change
  the wrapper's CSS `color`; `currentColor` follows it, proving the transform
  live for filled and outlined icons.
- **Inspector** — a dialog showing raw vs. transformed source side by side.
- **Export** — download a `.zip` (all browsers, via `fflate`), or, where the
  File System Access API exists (Chrome/Edge), write straight into a chosen
  folder with an overwrite prompt on collisions.

```bash
npm run dev -w @material-icon-wizard/web      # local dev server
npm run build -w @material-icon-wizard/web    # production build to dist/
```

The manifest is fetched once and cached in `localStorage`, keyed by version so a
version bump invalidates a stale cache. Icons are fetched live from jsDelivr.

## Development

Requires Node.js 18+ (for native `fetch`).

```bash
npm install         # install all workspaces
npm test            # run tests across all packages
npm run lint        # ESLint
npm run format      # Prettier --write
```

Run just the core tests:

```bash
npm test -w @material-icon-wizard/core
```

## Roadmap

1. ✅ `core` — icon source, `normalizeSvg` transform, `prepareIcon` pipeline (+ tests)
2. ✅ `cli` — `add` command, filesystem export with conflict handling (+ tests)
3. ✅ `web` — search + gallery + color verification + inspector + export (+ tests)
4. ✅ CI/CD — GitHub Actions for lint/test (`ci.yml`) and Pages deploy (`deploy-web.yml`)
