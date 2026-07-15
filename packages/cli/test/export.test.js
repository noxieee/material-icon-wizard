import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { exportIcons } from '../src/export.js';

let dir;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'icon-wizard-test-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function item(name, { transformed = null, raw = null } = {}) {
  return {
    name,
    source: 'material',
    status: 'found',
    rawSvg: raw,
    transformedSvg: transformed,
    warnings: [],
    errorMessage: null,
  };
}

// A stderr sink that records what was written.
function fakeStderr() {
  const lines = [];
  return { write: (s) => lines.push(s), text: () => lines.join('') };
}

describe('exportIcons', () => {
  it('writes transformed SVGs to <out>/<name>.svg and creates the dir', async () => {
    const out = path.join(dir, 'nested', 'icons');
    const summary = await exportIcons([item('lock', { transformed: '<svg>L</svg>' })], out, {
      isTTY: false,
    });
    expect(summary).toMatchObject({ written: 1, skipped: 0, conflicts: 0 });
    expect(await readFile(path.join(out, 'lock.svg'), 'utf8')).toBe('<svg>L</svg>');
  });

  it('prefers transformedSvg over rawSvg', async () => {
    await exportIcons([item('x', { transformed: '<svg>T</svg>', raw: '<svg>R</svg>' })], dir, {
      isTTY: false,
    });
    expect(await readFile(path.join(dir, 'x.svg'), 'utf8')).toBe('<svg>T</svg>');
  });

  it('falls back to raw SVG and warns when transform was expected but absent', async () => {
    const stderr = fakeStderr();
    await exportIcons([item('x', { raw: '<svg>R</svg>' })], dir, {
      isTTY: false,
      transform: true,
      stderr,
    });
    expect(await readFile(path.join(dir, 'x.svg'), 'utf8')).toBe('<svg>R</svg>');
    expect(stderr.text()).toMatch(/exporting raw SVG/);
  });

  it('does not warn about raw fallback when --no-transform (transform:false)', async () => {
    const stderr = fakeStderr();
    await exportIcons([item('x', { raw: '<svg>R</svg>' })], dir, {
      isTTY: false,
      transform: false,
      stderr,
    });
    expect(stderr.text()).not.toMatch(/exporting raw SVG/);
  });

  it('overwrites conflicts with force', async () => {
    await writeFile(path.join(dir, 'lock.svg'), 'OLD', 'utf8');
    const summary = await exportIcons([item('lock', { transformed: 'NEW' })], dir, {
      isTTY: false,
      force: true,
    });
    expect(summary).toMatchObject({ written: 1, skipped: 0, conflicts: 1 });
    expect(await readFile(path.join(dir, 'lock.svg'), 'utf8')).toBe('NEW');
  });

  it('keeps existing files with skipExisting', async () => {
    await writeFile(path.join(dir, 'lock.svg'), 'OLD', 'utf8');
    const summary = await exportIcons([item('lock', { transformed: 'NEW' })], dir, {
      isTTY: false,
      skipExisting: true,
    });
    expect(summary).toMatchObject({ written: 0, skipped: 1, conflicts: 1 });
    expect(await readFile(path.join(dir, 'lock.svg'), 'utf8')).toBe('OLD');
  });

  it('non-interactive with no flag: skips conflicts and warns (never prompts)', async () => {
    await writeFile(path.join(dir, 'lock.svg'), 'OLD', 'utf8');
    const stderr = fakeStderr();
    const prompt = vi.fn();
    const summary = await exportIcons([item('lock', { transformed: 'NEW' })], dir, {
      isTTY: false,
      stderr,
      promptFn: prompt,
    });
    expect(prompt).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ written: 0, skipped: 1 });
    expect(await readFile(path.join(dir, 'lock.svg'), 'utf8')).toBe('OLD');
    expect(stderr.text()).toMatch(/left untouched/);
  });

  it('TTY prompt accepted (y): overwrites all conflicts in one batch', async () => {
    await writeFile(path.join(dir, 'a.svg'), 'OLD', 'utf8');
    await writeFile(path.join(dir, 'b.svg'), 'OLD', 'utf8');
    const prompt = vi.fn().mockResolvedValue(true);
    const summary = await exportIcons(
      [
        item('a', { transformed: 'A' }),
        item('b', { transformed: 'B' }),
        item('c', { transformed: 'C' }),
      ],
      dir,
      { isTTY: true, promptFn: prompt },
    );
    expect(prompt).toHaveBeenCalledTimes(1); // single batch confirmation
    expect(summary).toMatchObject({ written: 3, skipped: 0, conflicts: 2 });
    expect(await readFile(path.join(dir, 'a.svg'), 'utf8')).toBe('A');
  });

  it('TTY prompt declined (n): skips conflicts, still writes non-conflicts', async () => {
    await writeFile(path.join(dir, 'a.svg'), 'OLD', 'utf8');
    const prompt = vi.fn().mockResolvedValue(false);
    const summary = await exportIcons(
      [item('a', { transformed: 'A' }), item('c', { transformed: 'C' })],
      dir,
      { isTTY: true, promptFn: prompt },
    );
    expect(summary).toMatchObject({ written: 1, skipped: 1, conflicts: 1 });
    expect(await readFile(path.join(dir, 'a.svg'), 'utf8')).toBe('OLD');
    expect(await readFile(path.join(dir, 'c.svg'), 'utf8')).toBe('C');
  });
});
