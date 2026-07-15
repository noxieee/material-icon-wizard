import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import Tooltip from 'primevue/tooltip';
import App from '../src/App.vue';
import { useIconStore } from '../src/store.js';

// Mock the two jsDelivr endpoints core talks to: the manifest data API and the
// per-icon CDN SVG.
function installFetchMock() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url) => {
      if (String(url).includes('data.jsdelivr.com')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [{ name: '/svg/lock/round.svg' }, { name: '/svg/home/round.svg' }],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<svg viewBox="0 0 24 24"><path d="M4 4" fill="#000"/></svg>'),
      });
    }),
  );
}

function mountApp() {
  return mount(App, {
    global: {
      plugins: [[PrimeVue, { theme: { preset: Aura, options: { darkModeSelector: false } } }]],
      directives: { tooltip: Tooltip },
    },
  });
}

beforeEach(() => {
  localStorage.clear();
  installFetchMock();
  // Reset the singleton store between tests.
  const { items, remove } = useIconStore();
  [...items].forEach((i) => remove(i.id));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App (runtime smoke)', () => {
  it('mounts with PrimeVue and renders the header and empty state', () => {
    const wrapper = mountApp();
    expect(wrapper.text()).toContain('Material Icon Wizard');
    expect(wrapper.text()).toContain('No icons yet');
  });

  it('loads the manifest, then adds a Material icon rendered inline with the transform', async () => {
    const wrapper = mountApp();
    await flushPromises(); // manifest load

    const store = useIconStore();
    store.addMaterial('lock');
    // Wait for the async prepareIcon (fetch + svgson transform) to settle.
    await vi.waitFor(() => {
      if (store.items[0]?.status !== 'found') throw new Error('not ready');
    });
    await flushPromises(); // let the card re-render with the result

    expect(wrapper.text()).toContain('lock');
    const svg = wrapper.find('.svg-holder svg');
    expect(svg.exists()).toBe(true);
    // the transform set fill=currentColor on the root and dropped the #000
    expect(svg.attributes('fill')).toBe('currentColor');
  });

  it('dedupes the same Material icon', async () => {
    mountApp();
    await flushPromises();
    const store = useIconStore();
    store.addMaterial('lock');
    store.addMaterial('lock');
    await flushPromises();
    expect(store.items.filter((i) => i.name === 'lock')).toHaveLength(1);
  });
});
