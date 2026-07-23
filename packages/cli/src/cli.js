#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { runAdd } from './commands/add.js';

// Pinned so an upstream icon-set update can't silently change already-shipped
// files. Override per-run with --icon-version if ever needed.
const DEFAULT_ICON_VERSION = '1.0.33';
const DEFAULT_STYLE = 'round';

const HELP = `icon-wizard — add Material icons (or custom SVGs) to a project, normalized to currentColor

Usage:
  icon-wizard add <name...> --out <dir> [options]
  icon-wizard add --file <path.svg> [--file ...] --out <dir> [options]

Arguments:
  <name...>              Material icon names (snake_case), e.g. lock lock_open menu

Options:
  -o, --out <dir>        Output directory (required)
      --file <path>      Add a custom SVG file (repeatable)
      --force            Overwrite existing files without prompting
      --skip-existing    Keep existing files (never overwrite)
      --no-transform     Emit raw SVG without the currentColor transform
      --print            Print raw and transformed source to stdout per icon
      --verbose          Alias for --print
      --icon-version <v> @material-icons/svg version (default ${DEFAULT_ICON_VERSION})
      --style <style>    Icon style (default ${DEFAULT_STYLE})
  -h, --help             Show this help

Examples:
  icon-wizard add lock lock_open menu --out ./src/assets/icons
  icon-wizard add --file ./my-icon.svg --out ./src/assets/icons
`;

function parse(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      out: { type: 'string', short: 'o' },
      file: { type: 'string', multiple: true },
      force: { type: 'boolean' },
      'skip-existing': { type: 'boolean' },
      'no-transform': { type: 'boolean' },
      print: { type: 'boolean' },
      verbose: { type: 'boolean' },
      'icon-version': { type: 'string' },
      style: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  return { values, positionals };
}

async function main(argv) {
  let parsed;
  try {
    parsed = parse(argv);
  } catch (err) {
    throw new Error(`${err.message}\n\n${HELP}`, { cause: err });
  }
  const { values, positionals } = parsed;

  const command = positionals[0];
  if (values.help || !command) {
    process.stdout.write(HELP);
    return;
  }

  if (command !== 'add') {
    throw new Error(`unknown command "${command}"\n\n${HELP}`);
  }

  if (values.force && values['skip-existing']) {
    throw new Error('--force and --skip-existing cannot be used together');
  }

  const names = positionals.slice(1);
  const files = values.file ?? [];
  if (names.length === 0 && files.length === 0) {
    throw new Error('nothing to add: pass icon names and/or --file <path>');
  }

  await runAdd(names, {
    out: values.out,
    files,
    force: Boolean(values.force),
    skipExisting: Boolean(values['skip-existing']),
    transform: !values['no-transform'],
    print: Boolean(values.print || values.verbose),
    iconVersion: values['icon-version'] ?? DEFAULT_ICON_VERSION,
    style: values.style ?? DEFAULT_STYLE,
  });
}

main(process.argv.slice(2)).catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
