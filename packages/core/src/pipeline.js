import { getIconUrl, downloadIconSvg } from './iconSource.js';
import { normalizeSvg } from './svgTransform.js';

/**
 * @typedef {Object} IconItem
 * @property {string} name
 * @property {'material'|'custom'} source
 * @property {'pending'|'found'|'missing'|'error'} status
 * @property {string|null} rawSvg          untouched original
 * @property {string|null} transformedSvg  output of normalizeSvg()
 * @property {string[]} warnings           from normalizeSvg()
 * @property {string|null} errorMessage
 */

function makeItem(name, source) {
  return {
    name,
    source,
    status: 'pending',
    rawSvg: null,
    transformedSvg: null,
    warnings: [],
    errorMessage: null,
  };
}

/**
 * Shared fetch→transform orchestration so the CLI and web app don't each
 * re-implement it. Existence checking (the `missing` status) is the caller's
 * job — in the web app search only ever offers names known to exist; in the
 * CLI the caller checks the manifest and marks misses before calling this.
 *
 * @param {{ name: string, rawSvg?: string }} input
 *   `{ name }` for a Material icon, or `{ name, rawSvg }` for a custom upload.
 * @param {{ version?: string, style?: string, transform?: boolean }} [opts]
 *   `version` is required for the Material path.
 * @returns {Promise<IconItem>}
 */
export async function prepareIcon(input, opts = {}) {
  const { version, style = 'round', transform = true } = opts;
  const source = input.rawSvg != null ? 'custom' : 'material';
  const item = makeItem(input.name, source);

  try {
    if (source === 'material') {
      if (!version) throw new Error('opts.version is required for Material icons');
      item.rawSvg = await downloadIconSvg(getIconUrl(input.name, version, style));
    } else {
      item.rawSvg = input.rawSvg;
    }
    item.status = 'found';

    if (transform) {
      const { svg, warnings } = await normalizeSvg(item.rawSvg);
      item.transformedSvg = svg;
      item.warnings = warnings;
    }
  } catch (err) {
    item.status = 'error';
    item.errorMessage = err.message;
  }

  return item;
}
