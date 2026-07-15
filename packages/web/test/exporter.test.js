import { describe, it, expect, vi, afterEach } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { buildIconZip, exportToFolder, canWriteToFolder } from '../src/exporter.js';

function item(name, o = {}) {
  return {
    id: 1,
    name,
    source: 'material',
    status: o.status ?? 'found',
    rawSvg: o.raw ?? null,
    transformedSvg: o.transformed ?? null,
    warnings: [],
    errorMessage: null,
  };
}

describe('buildIconZip', () => {
  it('includes only found items with content, named <name>.svg, preferring transformed', () => {
    const zip = buildIconZip([
      item('lock', { transformed: '<svg>L</svg>', raw: '<svg>RAW</svg>' }),
      item('home', { raw: '<svg>H</svg>' }),
      item('bad', { status: 'error' }),
      item('loading', { status: 'pending' }),
    ]);
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(['home.svg', 'lock.svg']);
    expect(strFromU8(files['lock.svg'])).toBe('<svg>L</svg>');
    expect(strFromU8(files['home.svg'])).toBe('<svg>H</svg>');
  });

  it('returns null when nothing is exportable', () => {
    expect(buildIconZip([item('bad', { status: 'error' })])).toBeNull();
  });
});

// A stand-in FileSystemDirectoryHandle: existing names collide, everything is
// writable, and writes are captured.
function fakeDir(existingNames = []) {
  const written = {};
  return {
    written,
    getFileHandle: vi.fn((name, opts) => {
      if (!opts?.create && !existingNames.includes(name)) {
        return Promise.reject(new Error('NotFoundError'));
      }
      return Promise.resolve({
        createWritable: () =>
          Promise.resolve({
            write: (data) => {
              written[name] = data;
              return Promise.resolve();
            },
            close: () => Promise.resolve(),
          }),
      });
    }),
  };
}

describe('exportToFolder', () => {
  afterEach(() => {
    delete window.showDirectoryPicker;
    vi.restoreAllMocks();
  });

  it('canWriteToFolder reflects showDirectoryPicker support', () => {
    delete window.showDirectoryPicker;
    expect(canWriteToFolder()).toBe(false);
    window.showDirectoryPicker = () => {};
    expect(canWriteToFolder()).toBe(true);
  });

  it('writes all files when there are no collisions (no prompt)', async () => {
    const dir = fakeDir([]);
    window.showDirectoryPicker = vi.fn(() => Promise.resolve(dir));
    window.confirm = vi.fn(() => true);

    const result = await exportToFolder([
      item('lock', { transformed: '<svg>L</svg>' }),
      item('home', { transformed: '<svg>H</svg>' }),
    ]);

    expect(result).toEqual({ written: 2, skipped: 0 });
    expect(window.confirm).not.toHaveBeenCalled();
    expect(dir.written['lock.svg']).toBe('<svg>L</svg>');
    expect(dir.written['home.svg']).toBe('<svg>H</svg>');
  });

  it('prompts once on collision and overwrites when confirmed', async () => {
    const dir = fakeDir(['lock.svg']);
    window.showDirectoryPicker = vi.fn(() => Promise.resolve(dir));
    window.confirm = vi.fn(() => true);

    const result = await exportToFolder([
      item('lock', { transformed: 'NEW' }),
      item('home', { transformed: 'H' }),
    ]);

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(2);
    expect(dir.written['lock.svg']).toBe('NEW');
  });

  it('skips everything when the overwrite prompt is declined', async () => {
    const dir = fakeDir(['lock.svg']);
    window.showDirectoryPicker = vi.fn(() => Promise.resolve(dir));
    window.confirm = vi.fn(() => false);

    const result = await exportToFolder([item('lock', { transformed: 'NEW' })]);

    expect(result).toEqual({ written: 0, skipped: 1 });
    expect(dir.written['lock.svg']).toBeUndefined();
  });
});
