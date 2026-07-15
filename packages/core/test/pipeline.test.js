import { describe, it, expect, vi, afterEach } from 'vitest';
import { prepareIcon } from '../src/pipeline.js';

afterEach(() => {
  vi.restoreAllMocks();
});

const MATERIAL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';

describe('prepareIcon — Material path', () => {
  it('fetches from the CDN and returns a transformed found item', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(MATERIAL_SVG) }),
    );
    const item = await prepareIcon({ name: 'lock' }, { version: '1.0.33' });

    expect(item.source).toBe('material');
    expect(item.status).toBe('found');
    expect(item.rawSvg).toBe(MATERIAL_SVG);
    expect(item.transformedSvg).toContain('fill="currentColor"');
    expect(item.errorMessage).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      'https://cdn.jsdelivr.net/npm/@material-icons/svg@1.0.33/svg/lock/round.svg',
    );
  });

  it('errors (status=error) without a version', async () => {
    const item = await prepareIcon({ name: 'lock' }, {});
    expect(item.status).toBe('error');
    expect(item.errorMessage).toMatch(/version is required/i);
  });

  it('captures a download failure as status=error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }),
    );
    const item = await prepareIcon({ name: 'nope' }, { version: '1.0.33' });
    expect(item.status).toBe('error');
    expect(item.errorMessage).toMatch(/404/);
    expect(item.transformedSvg).toBeNull();
  });

  it('skips the transform when opts.transform is false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(MATERIAL_SVG) }),
    );
    const item = await prepareIcon({ name: 'lock' }, { version: '1.0.33', transform: false });
    expect(item.status).toBe('found');
    expect(item.rawSvg).toBe(MATERIAL_SVG);
    expect(item.transformedSvg).toBeNull();
  });
});

describe('prepareIcon — custom path', () => {
  it('transforms provided rawSvg without any network call', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    const item = await prepareIcon({
      name: 'my-icon',
      rawSvg: '<svg viewBox="0 0 24 24"><path fill="#ff0000" d="M0 0"/></svg>',
    });

    expect(spy).not.toHaveBeenCalled();
    expect(item.source).toBe('custom');
    expect(item.status).toBe('found');
    expect(item.transformedSvg).toContain('currentColor');
    expect(item.transformedSvg).not.toContain('#ff0000');
  });

  it('propagates transform warnings (e.g. gradient paint)', async () => {
    const item = await prepareIcon({
      name: 'grad',
      rawSvg: '<svg viewBox="0 0 24 24"><path fill="url(#g)"/></svg>',
    });
    expect(item.status).toBe('found');
    expect(item.warnings).toHaveLength(1);
    expect(item.warnings[0]).toMatch(/url paint/i);
  });

  it('captures an unparseable custom svg as status=error', async () => {
    const item = await prepareIcon({ name: 'bad', rawSvg: '<div>nope</div>' });
    expect(item.status).toBe('error');
    expect(item.errorMessage).toMatch(/could not parse|root <svg>/i);
  });
});
