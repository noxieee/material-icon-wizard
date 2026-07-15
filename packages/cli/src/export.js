import { mkdir, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';

async function fileExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Default interactive prompt: a single batch confirmation read from stdin.
async function defaultPrompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

/**
 * Write each icon's SVG to `<outDir>/<name>.svg`.
 *
 * Content is `transformedSvg` when available, otherwise `rawSvg` (warned when
 * the transform was expected to run). Conflict handling matches the plan:
 * `--force` overwrites, `--skip-existing` keeps existing files, an interactive
 * TTY gets one batch confirmation listing all conflicts, and a non-interactive
 * run with neither flag defaults to skip-and-warn (never hangs on a prompt).
 *
 * @param {import('@material-icon-wizard/core').IconItem[]} items
 * @param {string} outDir
 * @param {{ force?: boolean, skipExisting?: boolean, transform?: boolean,
 *           isTTY?: boolean, promptFn?: (q: string) => Promise<boolean>,
 *           stderr?: NodeJS.WritableStream }} [opts]
 * @returns {Promise<{ written: number, skipped: number, conflicts: number }>}
 */
export async function exportIcons(items, outDir, opts = {}) {
  const {
    force = false,
    skipExisting = false,
    transform = true,
    isTTY = Boolean(process.stdout.isTTY),
    promptFn = defaultPrompt,
    stderr = process.stderr,
  } = opts;

  await mkdir(outDir, { recursive: true });

  const targets = items.map((item) => ({
    item,
    content: item.transformedSvg ?? item.rawSvg,
    filePath: path.join(outDir, `${item.name}.svg`),
  }));

  for (const t of targets) {
    if (transform && t.item.transformedSvg == null) {
      stderr.write(`  ⚠ ${t.item.name}: exporting raw SVG (was not transformed)\n`);
    }
  }

  const conflicts = [];
  for (const t of targets) {
    if (await fileExists(t.filePath)) conflicts.push(t);
  }

  let overwriteConflicts = false;
  if (conflicts.length > 0) {
    if (force) {
      overwriteConflicts = true;
    } else if (skipExisting) {
      overwriteConflicts = false;
    } else if (isTTY) {
      const list = conflicts.map((c) => `  - ${path.basename(c.filePath)}`).join('\n');
      overwriteConflicts = await promptFn(
        `${conflicts.length} file(s) already exist in ${outDir}:\n${list}\nOverwrite them? [y/N] `,
      );
    } else {
      stderr.write(
        `! ${conflicts.length} existing file(s) left untouched ` +
          `(use --force to overwrite, --skip-existing to silence)\n`,
      );
    }
  }

  const conflictPaths = new Set(conflicts.map((c) => c.filePath));
  let written = 0;
  let skipped = 0;
  for (const t of targets) {
    if (conflictPaths.has(t.filePath) && !overwriteConflicts) {
      skipped++;
      continue;
    }
    await writeFile(t.filePath, t.content, 'utf8');
    written++;
  }

  return { written, skipped, conflicts: conflicts.length };
}
