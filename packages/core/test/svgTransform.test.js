import { describe, it, expect } from 'vitest';
import { normalizeSvg } from '../src/svgTransform.js';

describe('normalizeSvg', () => {
  it('adds root fill=currentColor for a filled icon whose path has no fill (Material case)', async () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
    const { svg, warnings } = await normalizeSvg(input);
    expect(svg).toContain('fill="currentColor"');
    // the path had no fill and must not gain one — inheritance does the work
    expect(svg).toContain('<path d="M0 0h24v24H0z"/>');
    expect(svg).not.toMatch(/<path[^>]*fill=/);
    expect(warnings).toEqual([]);
  });

  it('rewrites an explicit real color to currentColor', async () => {
    const input = '<svg viewBox="0 0 24 24"><path d="M0 0" fill="#123456"/></svg>';
    const { svg } = await normalizeSvg(input);
    expect(svg).toContain('fill="currentColor"');
    expect(svg).not.toContain('#123456');
  });

  it('converts stroke but never introduces a fill for an outlined icon', async () => {
    const input =
      '<svg viewBox="0 0 24 24"><path d="M0 0" fill="none" stroke="rgb(1, 2, 3)"/></svg>';
    const { svg } = await normalizeSvg(input);
    expect(svg).toContain('fill="none"'); // preserved -> no unwanted solid fill
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).not.toContain('rgb(1, 2, 3)');
  });

  it('is element-agnostic: converts fill on circle/rect/g, not just path', async () => {
    const input =
      '<svg viewBox="0 0 24 24"><g fill="red"><circle fill="#fff"/><rect fill="hsl(0,0%,0%)"/></g></svg>';
    const { svg } = await normalizeSvg(input);
    expect(svg).not.toMatch(/red|#fff|hsl/);
    // g, circle, rect each converted, plus the root
    expect(svg.match(/currentColor/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('leaves none/transparent/inherit paints untouched', async () => {
    const input =
      '<svg viewBox="0 0 24 24"><path fill="transparent" stroke="inherit"/><rect fill="none"/></svg>';
    const { svg } = await normalizeSvg(input);
    expect(svg).toContain('fill="transparent"');
    expect(svg).toContain('stroke="inherit"');
    expect(svg).toContain('fill="none"');
  });

  it('handles the inline style="fill:…;stroke:…" form and drops color:', async () => {
    const input =
      '<svg viewBox="0 0 24 24"><path style="fill:#abc;stroke:blue;color:green;opacity:.5"/></svg>';
    const { svg } = await normalizeSvg(input);
    expect(svg).toContain('fill:currentColor');
    expect(svg).toContain('stroke:currentColor');
    expect(svg).toContain('opacity:.5'); // unrelated declaration preserved
    expect(svg).not.toMatch(/color:green/);
    expect(svg).not.toMatch(/#abc|blue|green/);
  });

  it('rewrites fill/stroke and drops color inside a <style> block without touching selectors', async () => {
    const input =
      '<svg viewBox="0 0 24 24"><style>.a:hover{fill:#f00;color:blue;stroke:#0f0}</style><path class="a"/></svg>';
    const { svg } = await normalizeSvg(input);
    expect(svg).toContain('.a:hover{'); // pseudo-class selector intact
    expect(svg).toContain('fill:currentColor');
    expect(svg).toContain('stroke:currentColor');
    expect(svg).not.toMatch(/#f00|#0f0|color:blue/);
  });

  it('leaves url(#…) gradient paints as-is and records a warning', async () => {
    const input =
      '<svg viewBox="0 0 24 24"><defs><linearGradient id="g"/></defs><path fill="url(#g)"/></svg>';
    const { svg, warnings } = await normalizeSvg(input);
    expect(svg).toContain('fill="url(#g)"');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/url paint/i);
  });

  it('strips XML prolog, DOCTYPE, and leading comments by serializing from <svg>', async () => {
    const input = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<!-- exported from Some Editor -->
<svg viewBox="0 0 24 24"><path d="M0 0" fill="#000"/></svg>`;
    const { svg } = await normalizeSvg(input);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).not.toContain('<?xml');
    expect(svg).not.toContain('DOCTYPE');
    expect(svg).not.toContain('<!--');
  });

  it('preserves an explicit root fill="none" rather than forcing currentColor', async () => {
    const input = '<svg viewBox="0 0 24 24" fill="none"><path stroke="#000"/></svg>';
    const { svg } = await normalizeSvg(input);
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('stroke="currentColor"');
  });

  it('is idempotent — a second pass is a no-op', async () => {
    const input = '<svg viewBox="0 0 24 24"><path d="M0 0" fill="#123"/></svg>';
    const once = await normalizeSvg(input);
    const twice = await normalizeSvg(once.svg);
    expect(twice.svg).toBe(once.svg);
    expect(twice.warnings).toEqual([]);
  });

  it('throws on input without a root <svg> element', async () => {
    await expect(normalizeSvg('<div>not an svg</div>')).rejects.toThrow(
      /could not parse|root <svg>/i,
    );
  });
});
