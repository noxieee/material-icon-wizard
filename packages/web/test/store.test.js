import { describe, it, expect, beforeEach, vi } from 'vitest';

const KEY = 'miw:selected-icons:v1';

// Each test imports a fresh store module (resetModules) so hydrate() runs
// against the localStorage state we set up in that test.
beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

async function freshStore() {
  const { useIconStore } = await import('../src/store.js');
  return useIconStore();
}

describe('store persistence', () => {
  it('hydrates previously-saved found icons on init', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        {
          name: 'lock',
          source: 'material',
          rawSvg: '<svg/>',
          transformedSvg: '<svg fill="currentColor"/>',
          warnings: [],
        },
      ]),
    );
    const { items } = await freshStore();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: 'lock',
      source: 'material',
      status: 'found',
      transformedSvg: '<svg fill="currentColor"/>',
    });
  });

  it('persists a custom icon (with its SVG) once prepared', async () => {
    const store = await freshStore();
    store.addCustom('mine', '<svg viewBox="0 0 24 24"><path fill="#000" d="M0 0"/></svg>');

    await vi.waitFor(() => {
      const data = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (data.length !== 1 || !data[0].transformedSvg) throw new Error('not persisted yet');
    });

    const data = JSON.parse(localStorage.getItem(KEY));
    expect(data[0]).toMatchObject({ name: 'mine', source: 'custom' });
    expect(data[0].transformedSvg).toContain('currentColor');
    expect(data[0].rawSvg).toContain('#000'); // raw original kept for re-transform
  });

  it('does not persist pending or errored items', async () => {
    const store = await freshStore();
    // an unparseable custom svg ends up status: 'error'
    store.addCustom('bad', '<div>nope</div>');
    await vi.waitFor(() => {
      if (store.items[0]?.status !== 'error') throw new Error('not settled');
    });
    expect(JSON.parse(localStorage.getItem(KEY) || '[]')).toEqual([]);
  });

  it('clear() empties the persisted selection', async () => {
    const store = await freshStore();
    store.addCustom('x', '<svg viewBox="0 0 24 24"><path fill="#000" d="M0 0"/></svg>');
    await vi.waitFor(() => {
      if (JSON.parse(localStorage.getItem(KEY) || '[]').length !== 1) throw new Error('nr');
    });
    store.clear();
    await vi.waitFor(() => {
      if (JSON.parse(localStorage.getItem(KEY) || '[]').length !== 0) throw new Error('nr');
    });
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual([]);
  });
});
