import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getIconManifest, iconExists, prepareIcon } from '@material-icon-wizard/core';
import { exportIcons } from '../export.js';

function nameFromFile(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function printItem(item, stdout) {
  stdout.write(`\n=== ${item.name} (${item.source}, ${item.status}) ===\n`);
  if (item.rawSvg) stdout.write(`--- raw ---\n${item.rawSvg}\n`);
  if (item.transformedSvg) stdout.write(`--- transformed ---\n${item.transformedSvg}\n`);
}

/**
 * The `add` command: resolve custom files and Material icon names into prepared
 * IconItems (fetch/read → normalize), report per-icon warnings, optionally
 * print source, then export the ones with content to `--out`.
 *
 * @param {string[]} names Material icon names (positional args)
 * @param {{ out: string, files: string[], force: boolean, skipExisting: boolean,
 *           transform: boolean, print: boolean, iconVersion: string, style: string }} opts
 */
export async function runAdd(names, opts) {
  if (!opts.out) {
    throw new Error('--out <dir> is required');
  }

  const items = [];

  // Custom SVG uploads — read from disk, no existence check needed.
  for (const file of opts.files) {
    let rawSvg;
    try {
      rawSvg = await readFile(file, 'utf8');
    } catch (err) {
      process.stderr.write(`✗ skipping --file ${file}: ${err.message}\n`);
      continue;
    }
    items.push(
      await prepareIcon({ name: nameFromFile(file), rawSvg }, { transform: opts.transform }),
    );
  }

  // Material icons — check the manifest once, warn+skip typos, prepare the rest.
  if (names.length > 0) {
    let manifest;
    try {
      manifest = await getIconManifest(opts.iconVersion, opts.style);
    } catch (err) {
      throw new Error(`could not fetch icon manifest: ${err.message}`);
    }
    for (const name of names) {
      if (!iconExists(name, manifest)) {
        process.stderr.write(`! "${name}" is not a Material icon (${opts.style}) — skipping\n`);
        continue;
      }
      items.push(
        await prepareIcon(
          { name },
          { version: opts.iconVersion, style: opts.style, transform: opts.transform },
        ),
      );
    }
  }

  for (const item of items) {
    for (const warning of item.warnings) {
      process.stderr.write(`  ⚠ ${item.name}: ${warning}\n`);
    }
    if (item.status === 'error') {
      process.stderr.write(`✗ ${item.name}: ${item.errorMessage}\n`);
    }
  }

  if (opts.print) {
    for (const item of items) printItem(item, process.stdout);
  }

  const exportable = items.filter((item) => item.status === 'found');
  if (exportable.length === 0) {
    process.stderr.write('Nothing to export.\n');
    return;
  }

  const summary = await exportIcons(exportable, opts.out, {
    force: opts.force,
    skipExisting: opts.skipExisting,
    transform: opts.transform,
  });

  process.stdout.write(
    `Exported ${summary.written} icon(s) to ${opts.out}` +
      (summary.skipped ? `, skipped ${summary.skipped} existing` : '') +
      '.\n',
  );
}
