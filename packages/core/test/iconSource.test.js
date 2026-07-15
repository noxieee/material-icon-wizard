import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getIconUrl,
  getIconManifest,
  iconExists,
  downloadIconSvg,
  searchIcons,
} from '../src/iconSource.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getIconUrl', () => {
  it('builds a pinned-version round-style CDN url by default', () => {
    expect(getIconUrl('lock_open', '1.0.33')).toBe(
      'https://cdn.jsdelivr.net/npm/@material-icons/svg@1.0.33/svg/lock_open/round.svg',
    );
  });

  it('honors an explicit style', () => {
    expect(getIconUrl('home', '1.0.33', 'outline')).toBe(
      'https://cdn.jsdelivr.net/npm/@material-icons/svg@1.0.33/svg/home/outline.svg',
    );
  });
});

describe('getIconManifest', () => {
  const flat = {
    files: [
      { name: '/package.json' },
      { name: '/svg/lock/round.svg' },
      { name: '/svg/lock/outline.svg' },
      { name: '/svg/lock_open/round.svg' },
      { name: '/svg/home/round.svg' },
      { name: '/svg/home/baseline.svg' },
    ],
  };

  it('reduces the flat listing to the set of round-style icon names', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(flat) }),
    );
    const manifest = await getIconManifest('1.0.33');
    expect(manifest).toBeInstanceOf(Set);
    expect([...manifest].sort()).toEqual(['home', 'lock', 'lock_open']);
    expect(fetch).toHaveBeenCalledWith(
      'https://data.jsdelivr.com/v1/packages/npm/@material-icons/svg@1.0.33?structure=flat',
    );
  });

  it('can select a different style', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(flat) }),
    );
    const manifest = await getIconManifest('1.0.33', 'outline');
    expect([...manifest]).toEqual(['lock']);
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }),
    );
    await expect(getIconManifest('9.9.9')).rejects.toThrow(/404/);
  });

  it('throws when the manifest yields no icons for the style', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ files: [] }) }),
    );
    await expect(getIconManifest('1.0.33')).rejects.toThrow(/no "round" icons/);
  });
});

describe('iconExists', () => {
  it('is a set membership check', () => {
    const manifest = new Set(['lock', 'home']);
    expect(iconExists('lock', manifest)).toBe(true);
    expect(iconExists('nope', manifest)).toBe(false);
  });
});

describe('downloadIconSvg', () => {
  it('returns the response body text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('<svg/>') }),
    );
    await expect(downloadIconSvg('https://x/y.svg')).resolves.toBe('<svg/>');
  });

  it('throws on a non-ok response, including the url', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' }),
    );
    await expect(downloadIconSvg('https://x/y.svg')).rejects.toThrow(/500.*x\/y\.svg/);
  });
});

describe('searchIcons', () => {
  const manifest = new Set(['lock', 'lock_open', 'lock_reset', 'block', 'home', 'padlock']);

  it('returns [] for an empty/whitespace query', () => {
    expect(searchIcons('   ', manifest)).toEqual([]);
  });

  it('ranks prefix matches ahead of substring matches, shorter first', () => {
    const results = searchIcons('lock', manifest);
    // prefix matches (lock, lock_open, lock_reset) before substring (block, padlock)
    expect(results.slice(0, 3)).toEqual(['lock', 'lock_open', 'lock_reset']);
    expect(results).toContain('block');
    expect(results).toContain('padlock');
    expect(results.indexOf('lock_open')).toBeLessThan(results.indexOf('block'));
  });

  it('treats spaces and hyphens as equivalent to underscores', () => {
    expect(searchIcons('lock open', manifest)).toContain('lock_open');
    expect(searchIcons('lock-open', manifest)).toContain('lock_open');
  });

  it('is case-insensitive', () => {
    expect(searchIcons('LOCK', manifest)).toContain('lock');
  });

  it('caps results at the given limit', () => {
    expect(searchIcons('lock', manifest, 2)).toHaveLength(2);
  });
});
