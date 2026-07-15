# material-icon-wizard

Command-line tool to add [Material Icons](https://fonts.google.com/icons) (or
your own SVGs) to a project, **normalized so their color follows the CSS
`currentColor` property** — recolor any icon with a single CSS `color` rule, for
both filled and outlined icons.

It fetches the classic fixed-weight Material Icons (round style) from the pinned
[`@material-icons/svg`](https://www.npmjs.com/package/@material-icons/svg)
package over jsDelivr, rewrites every baked-in `fill`/`stroke` color to
`currentColor`, and writes the result to a folder you choose.

> Prefer a GUI? There's a companion web app:
> **https://noxieee.github.io/material-icon-wizard/**

## Usage

No install needed — run it with `npx`:

```bash
npx material-icon-wizard add lock lock_open menu --out ./src/assets/icons
```

Or install globally for the `icon-wizard` command:

```bash
npm install -g material-icon-wizard
icon-wizard add lock lock_open menu --out ./src/assets/icons
```

Requires Node.js 18+ (for the native `fetch` API).

## What it does

For every icon it writes `<out>/<name>.svg`, transformed by one rule —
**convert, never introduce**:

- an existing `fill`/`stroke` color (`#hex`, `rgb()`, `hsl()`, named) → `currentColor`
- `none` / `transparent` / `inherit` and absent paints → left untouched (so no
  unwanted fill or outline is added)
- `url(#…)` gradient paints → left as-is, with a warning
- the root `<svg>` gets `fill="currentColor"` only if it had no fill, fixing
  SVG's black-by-default inheritance

The same transform is applied to attributes, inline `style="…"`, and `<style>`
blocks, and works for both filled and outlined icons. Any XML prolog / DOCTYPE /
leading comments are stripped.

## Adding custom SVGs

Use `--file` (repeatable) for your own SVGs; they go through the exact same
normalization. The output name comes from the file's base name.

```bash
npx material-icon-wizard add --file ./brand/logo.svg --out ./src/assets/icons
# mix names and files in one run:
npx material-icon-wizard add home settings --file ./brand/logo.svg --out ./icons
```

## Behavior

- **Unknown names** print a warning and are skipped — the batch continues, so a
  typo in a long list won't abort the run.
- **Conflicts:** an interactive terminal gets a single confirmation before
  overwriting existing files; a non-interactive run (pipe/CI) skips-and-warns
  instead of hanging. Use `--force` to overwrite or `--skip-existing` to keep
  existing files explicitly.
- Warnings/skips go to **stderr**; the summary goes to **stdout**.

## Options

| Flag                   | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `--out <dir>`, `-o`    | **Required.** Output directory.                   |
| `--file <path>`        | Add a custom SVG. Repeatable.                     |
| `--force`              | Overwrite existing files without prompting.       |
| `--skip-existing`      | Keep existing files, never overwrite.             |
| `--no-transform`       | Emit raw SVG without the `currentColor` rewrite.  |
| `--print`, `--verbose` | Print raw and transformed source per icon.        |
| `--icon-version <v>`   | `@material-icons/svg` version (default `1.0.33`). |
| `--style <style>`      | Icon style (default `round`).                     |
| `-h`, `--help`         | Show help.                                        |

Icon names are snake_case (`lock_open`, `arrow_back`); browse them at
[fonts.google.com/icons](https://fonts.google.com/icons).

## License

MIT
