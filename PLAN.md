# Material Icon Wizard — Plan

## Goal

Replace the current manual workflow (search fonts.google.com → download SVG → run a shell/regex
script → copy into project) with tooling that: takes icon names, verifies they exist, previews
them, fixes them (`fill="currentColor"`), verifies the fix visually, and exports to a project
folder. Two front ends share one logic core:

- a **CLI tool** (Node.js) for scripted/local use
- a **web app** (Vue 3 + PrimeVue) hosted on **GitHub Pages** for a GUI, usable from any machine
  with no install

This replaces the earlier Python-desktop plan. Cross-platform macOS/Windows support falls out for
free here — Node.js CLIs and browsers are already cross-platform, so there's no packaging step
(no PyInstaller, no per-OS builds) the way a desktop app would need.

## Monorepo structure

```
material-icon-wizard/
  packages/
    core/                  # pure JS, shared logic — no Node-only or browser-only APIs
      src/
        iconSource.js       # manifest fetch/cache, existence check, getIconUrl(), downloadIconSvg()
        svgTransform.js      # normalizeSvg() — parse, currentColor rewrite, prolog/doctype strip
        pipeline.js          # prepareIcon() — shared fetch→transform→IconItem orchestration
        index.js
      test/
        svgTransform.test.js
        iconSource.test.js
        pipeline.test.js
      package.json
    cli/                   # Node CLI, depends on core
      src/
        cli.js
        commands/
          add.js
          export.js
      package.json           # "bin" entry point
    web/                    # Vue 3 + PrimeVue app, depends on core
      src/
        components/
          IconSearchBar.vue
          IconGallery.vue
          IconCard.vue
          CodeInspector.vue
          ExportPanel.vue
        App.vue
        main.js
      vite.config.js          # base: '/<repo-name>/' for GitHub Pages
      package.json
  .github/
    workflows/
      ci.yml                  # lint + test all packages on PR
      deploy-web.yml           # build web/, deploy to GitHub Pages on push to main
  package.json                # npm workspaces root
  PLAN.md
```

**Tooling choice:** plain **npm workspaces** (built into npm, no extra tool). Three packages is
small enough that Nx/Turborepo would be added complexity without a clear payoff — easy to
introduce later if the monorepo grows.

**Core package constraint:** `core` must stay isomorphic — usable unmodified from both Node (CLI)
and the browser (web app). Concretely: use the global `fetch` API (native in Node 18+ and all
browsers) instead of `axios`/`node-fetch`, and avoid any `fs`/`path`/DOM APIs in `core` — those
belong in `cli`/`web` respectively, which call into `core` for the logic and handle their own I/O.

Core carries exactly one runtime dependency — **`svgson`**, a small pure-JS SVG parser/serializer
used by the transform (below). It's isomorphic (same code path in Node and the browser), which is
deliberate: the transform's output is then identical in both environments, so `core`'s Node unit
tests faithfully predict the deployed web app's behavior. Everything else in `core` stays
dependency-free (native `fetch`).

## Icon source

Material Icons (fixed-weight/classic set, not Material Symbols — no variable axes) are static
SVGs published in the `@material-icons/svg` npm package, served via jsDelivr (confirmed CORS-open:
`access-control-allow-origin: *`, so this works directly from browser JS too, not just Node):

```
https://cdn.jsdelivr.net/npm/@material-icons/svg@<version>/svg/<icon_name>/<style>.svg
```

- `<icon_name>` — snake_case, e.g. `lock`, `lock_open`, `app_blocking`
- `<style>` — this project only uses **`round`** (confirmed; it's `round`, not `rounded`)
- **Pin the version** (e.g. `1.0.33`) rather than `latest`, so an upstream icon-set update can't
  silently change files already shipped in a project.

Confirmed the source files never include an XML prolog (`<?xml ...?>`) — they start directly with
`<svg ...>`. Custom uploads often do carry a prolog/DOCTYPE — the transform below strips them.

### Existence check strategy

Fetch the package's flat file listing once via jsDelivr's data API (also CORS-open) and cache it,
rather than firing a request per icon name:

```
GET https://data.jsdelivr.com/v1/packages/npm/@material-icons/svg@<version>?structure=flat
```

Build a `Set` of valid icon names for the `round` style from the response, cache it (in `core`,
exposed as `getIconManifest()` — caller decides *where* to persist the cache: `localStorage` in
the web app, a file under an OS cache dir in the CLI). Existence checks then become instant local
lookups, which matters when a user pastes in a large batch of names at once. **Key the cache by
version** so bumping the pinned `@material-icons/svg` version invalidates a stale manifest rather
than serving old icon names.

## Shared `core` package API (sketch)

```js
// iconSource.js
export async function getIconManifest(version) { /* fetch + return Set<string> of icon names */ }
export function iconExists(name, manifest) { /* Set.has() */ }
export function getIconUrl(name, version, style = 'round') { /* build URL string */ }
export async function downloadIconSvg(url) { /* fetch(url).then(r => r.text()) */ }
export function searchIcons(query, manifest, limit = 20) { /* ranked local match, see below */ }

// svgTransform.js
export function normalizeSvg(svgText, opts) {
  // parse (svgson) → rewrite every existing fill/stroke color to currentColor (attribute,
  // inline style, <style> blocks) → set root <svg fill="currentColor"> → serialize from the
  // <svg> node (which drops any XML prolog / DOCTYPE / leading junk for free).
  // returns { svg: string, warnings: string[] }
}

// pipeline.js — shared orchestration so CLI and web don't each re-implement fetch→transform
export async function prepareIcon(input, opts) {
  // input: { name } for Material, or { name, rawSvg } for a custom upload.
  // Material path: getIconUrl → downloadIconSvg → normalizeSvg.
  // Custom path:   normalizeSvg(rawSvg).
  // returns the IconItem data-model object (below), warnings included.
}
```

`searchIcons()` powers the web app's type-ahead search (below): local, in-memory matching against
the already-cached manifest — prefix match ranked first, then substring match, case-insensitive,
treating `_`/space/`-` as equivalent (so "lock open" matches `lock_open`), capped to a small
result count (e.g. 20) since each result needs a preview thumbnail fetched over the network.

### Transform: `normalizeSvg()`

`fix_material_icons_svg_v1.0.2.sh` is the *idea*, not the spec: force the icon's color to follow
the CSS `color` property via `currentColor`, so a single CSS rule recolors it. That script used
Perl regex on raw text and only touched `<svg>` and `<path>` — fine for the very regular Material
set, but it silently misses `<circle>`/`<rect>`/`<g>`/etc., colors set via `style="..."` or
`<style>` blocks, and stroke-based (outlined) icons. Custom uploads hit all of those. So `core`
parses the SVG into a real tree (via the isomorphic **`svgson`** dependency) and manipulates nodes
instead of regex-matching text: one code path, element-agnostic, robust across both Material and
arbitrary custom SVGs.

**The key rule — convert, never introduce.** For each paint property (`fill` and `stroke`), on
every element, look only at the value that's *already there*:

| current value                                  | action                          |
|------------------------------------------------|---------------------------------|
| a real color (`#hex`, `rgb()`, `hsl()`, named) | rewrite to `currentColor`       |
| `none` / `transparent` / `inherit`             | leave untouched                 |
| `url(#…)` (gradient/pattern)                    | leave, and record a **warning** |
| absent                                          | leave (it inherits)             |

We never *add* a `fill`/`stroke` that wasn't already painting. That single rule is what makes the
same transform correct for **both** icon kinds without detecting which is which:

- **Filled icon** — shapes carry a `fill` color → becomes `currentColor`; no stroke exists, so none
  is added (no unwanted outline appears).
- **Outlined icon** — shapes carry `fill="none"` (kept) plus a `stroke` color → the stroke becomes
  `currentColor` (no unwanted solid fill appears).

This applies to the attribute form, the inline `style="fill:…;stroke:…"` form, and `fill:`/`stroke:`
color values inside `<style>` blocks. `color:` declarations in inline styles / `<style>` are
removed, so the icon's `currentColor` resolves to the *consumer's* CSS `color`, never a value baked
into the file.

**Inheritance default.** SVG's initial `fill` is black (not `currentColor`), so an element with no
explicit fill would render black regardless of CSS `color`. To catch that common Material case (the
visible `<path>` often has no `fill` attribute at all), `normalizeSvg` sets `fill="currentColor"` on
the **root `<svg>`** so those elements inherit the CSS color. The root `stroke` is left alone
(initial stroke is `none`; we must not introduce strokes on filled icons).

**Prolog / DOCTYPE stripping falls out for free.** Because the output is serialized *from the
`<svg>` node*, anything outside it — an `<?xml …?>` declaration, a `<!DOCTYPE …>`, leading comments,
trailing whitespace — simply isn't in the output. No separate regex-based `stripXmlProlog()` step is
needed; "leave only the `<svg>` tag" is a consequence of parse-then-serialize.

**Warnings, not silent failure.** `normalizeSvg` returns `{ svg, warnings }`. `warnings` flags
anything it couldn't confidently convert — a `url(#gradient)` paint, an unparseable construct — so
the CLI can print it to stderr and the web app can badge the icon, rather than exporting a broken
icon that looks fine.

## Data model (shared shape, used by both CLI and web)

```js
// source: 'material' | 'custom'
// status: 'pending' | 'found' | 'missing' | 'error'
{
  name: string,
  source: 'material' | 'custom',
  status: 'pending' | 'found' | 'missing' | 'error',
  rawSvg: string | null,          // untouched original
  transformedSvg: string | null,   // output of normalizeSvg()
  warnings: string[],              // from normalizeSvg() — e.g. gradient paint left as-is
  errorMessage: string | null,
}
```

## CLI tool (`packages/cli`)

Non-interactive, scriptable. Example shape:

```
icon-wizard add lock lock_open menu --out ./src/assets/icons
icon-wizard add --file ./my-custom-icon.svg --out ./src/assets/icons
```

- **Input:** icon names as positional args, and/or `--file <path>` for custom SVGs (repeatable).
- **Existence check:** missing names print a warning to stderr and are skipped; found + custom
  icons proceed. (Batch continues rather than hard-failing on one typo; a `--strict` flag to
  fail the whole run on any miss could be added later if wanted — not building it now.)
- **Transform:** applied automatically via `core`'s `prepareIcon()` (fetch/read → `normalizeSvg`).
  A `--no-transform` flag can emit the raw SVG untouched if ever needed. Any transform warnings
  (e.g. a gradient paint left as-is) print to stderr per icon.
- **Inspection:** `--print` (or `--verbose`) prints raw and transformed SVG source to stdout per
  icon, replacing the GUI's code inspector for CLI use.
- **Verification:** the CLI ships no preview generator — `--print` already lets you inspect the
  transformed source, and visual "does `currentColor` respond" verification belongs in the web app
  (below). (A static `preview.html` emitter was considered and dropped as gold-plating.)
- **Export:** writes `transformedSvg` (or `rawSvg` with a warning if for some reason not yet
  transformed) to `--out <dir>` as `<name>.svg`. Real filesystem access here (no browser
  sandboxing), so:
  - **Conflict behavior:** prompt before overwriting an existing file (a single batch confirmation
    listing all conflicts) — but *only* when stdout is a TTY, so scripted/CI use stays
    non-interactive. `--force` overwrites without prompting; `--skip-existing` keeps existing files.
    In a non-TTY run with neither flag, default to skip-and-warn rather than hang on a prompt.

## Web app (`packages/web`, Vue 3 + PrimeVue)

Same feature set, browser-native versions:

1. **Icon search & add (primary entry point)** — a live search bar (PrimeVue `AutoComplete` fits
   this well) backed entirely by the already-cached manifest, so it's instant/local with no
   network round-trip for the matching itself:
   - as the user types (debounced, e.g. ~200ms), call `searchIcons(query, manifest)` to get up to
     ~20 candidate icon names
   - for each candidate, lazily fetch its SVG (if not already cached in-memory from a previous
     search) and render it as a small preview thumbnail next to the name in the suggestion list
   - clicking a suggestion (or its "Add" affordance) appends it directly to the gallery/export
     pipeline as an `IconItem(source: material, status: found)` — no separate existence check
     needed, since it only ever suggests names that are already confirmed to exist
   - the search field then resets, ready for the next query, so adding several icons is a quick
     repeated search → click loop rather than one blind list paste

   No separate bulk name-paste input in the web app — search is the only way to add Material
   icons, so every icon added this way is guaranteed to exist and the `missing` status is never
   reached from the GUI (it remains relevant for the CLI, where positional args can still typo).
2. **Custom icon upload** — `<input type="file" multiple accept=".svg">`, read via `FileReader`,
   fed into the same pipeline/data shape as Material-sourced icons.
3. **Icon gallery** — grid of cards (PrimeVue `Card`/`DataView`), each rendering the icon inline
   as real DOM SVG (trivial in a browser — no special widget needed, unlike a desktop toolkit),
   with name + status badge + remove button.
4. **Transform actions** — icons run through `normalizeSvg` automatically on add; a button can
   re-run it per-icon or in bulk. `rawSvg` is preserved untouched so the user can re-run or compare
   anytime, and any `warnings` show as a badge on the card.
5. **Color verification** — each gallery card renders the transformed SVG inside a wrapper whose CSS
   `color` the user can change: a few preset swatches and/or a native `<input type="color">`.
   `currentColor` inherits through the normal cascade, so flipping the color instantly proves the
   transform worked — for filled *and* outlined icons. This lives on the card itself; no dedicated
   `ColorCyclePreview` component and no continuous animation (a single deliberate color change
   proves as much as a cycle, with less moving code).
6. **Raw code inspector** — a code panel (e.g. PrimeVue `Panel` + `<pre>`, or a lightweight syntax
   highlighter) showing the selected icon's raw vs. transformed source, switchable/side-by-side.
7. **Export — zip first, direct-folder-write as enhancement:**
   - **Primary path (all browsers):** bundle the transformed SVGs into a `.zip` (via `fflate`) and
     trigger a normal download. Universal, dependency-light, and the fastest route to a working
     export — build this first.
   - **Enhancement (Chrome/Edge):** feature-detect `window.showDirectoryPicker` (File System Access
     API); when present, offer "write directly to a folder" as the closer match to the original
     "paste into project folder" workflow. On this path only, check the chosen directory handle for
     name collisions and prompt before overwriting, consistent with the CLI. Firefox/Safari simply
     don't see this option and use the zip path.

## Deployment (GitHub Pages)

- `vite.config.js` in `web/` sets `base: '/<repo-name>/'` (required for a GitHub Pages *project*
  site served from a subpath — skip this only if using a custom domain or a `<user>.github.io`
  root-level repo).
- `.github/workflows/deploy-web.yml`: on push to `main`, build `packages/web` (which pulls in
  `packages/core` as a workspace dependency) and publish via `actions/deploy-pages`.
- `.github/workflows/ci.yml`: on PRs, run lint + `core`'s unit tests (and any CLI/web tests) across
  the workspace.

## Suggested build order

1. `core`: `svgTransform.js` (`normalizeSvg` on a real parsed tree, with unit tests covering
   filled, outlined, `style`/`<style>`, prolog/DOCTYPE, and gradient-warning cases) +
   `iconSource.js` (manifest fetch/cache + download) + `pipeline.js` (`prepareIcon`), fully
   isomorphic, no I/O side-effects beyond `fetch`.
2. `cli`: wire `core`'s `prepareIcon` into a minimal `add`/`export` command pair, real filesystem
   export with TTY-gated prompt-on-conflict plus `--force`/`--skip-existing`.
3. `web`: basic Vue shell — search bar with debounced `searchIcons()` + preview thumbnails →
   add-to-gallery flow → gallery with inline SVG previews.
4. `web`: custom upload, transform buttons, raw code inspector.
5. `web`: color verification (swatches / color input on each card).
6. `web`: export — zip download first (universal), then the File System Access direct-write
   enhancement.
7. CI/CD: GitHub Actions workflows for test/lint and GitHub Pages deploy.

## Open questions / TBD (status as built)

- ~~Exact behavior of "strip XML prolog"~~ — **resolved & shipped**: serializing from the `<svg>`
  node drops the prolog, DOCTYPE, and any leading comments as a side effect, so there was no
  separate edge-case surface to specify. Covered by `core`'s transform tests.
- ~~CLI distribution~~ — **resolved**: published to npm as the unscoped package
  **`material-icon-wizard`** (`npx material-icon-wizard add ...`, or global install for the
  `icon-wizard` command). The published artifact is a single self-contained esbuild bundle with
  `core` + `svgson` inlined, so `core` never had to be published separately. (Note: the package
  needs a `bin` entry matching its own name for bare `npx material-icon-wizard` to resolve.)
- Runtime CDN dependency: the deployed web app fetches the manifest and every icon from jsDelivr
  live (CORS confirmed open). **No fetch retry/backoff exists** — worth adding if flakiness shows
  up. Partly mitigated in practice: the manifest is cached in `localStorage` (keyed by version) and
  the user's selected icons are persisted across reloads, so a returning session doesn't re-hit the
  CDN for those.
- Other icon styles (outline/sharp/etc.): only `round` is supported — no style selector exists. The
  API keeps `style` as a parameter (`getIconUrl(name, version, style)`, `getIconManifest(version,
  style)`), so adding a selector later is a small change, not a redesign.
