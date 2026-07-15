import { describe, it, expect } from 'vitest';
import { computeDiffHtml } from '../src/diffHtml.js';

describe('computeDiffHtml', () => {
  it('returns null when either side is missing', () => {
    expect(computeDiffHtml(null, '<svg/>')).toBeNull();
    expect(computeDiffHtml('<svg/>', null)).toBeNull();
  });

  it('escapes source and adds no diff spans when identical', () => {
    const { raw, transformed } = computeDiffHtml('<svg fill="red"/>', '<svg fill="red"/>');
    expect(raw).toBe('&lt;svg fill="red"/&gt;');
    expect(transformed).toBe('&lt;svg fill="red"/&gt;');
    expect(raw).not.toContain('<span');
  });

  it('marks removed tokens in raw and added tokens in transformed', () => {
    const { raw, transformed } = computeDiffHtml(
      '<svg fill="#000"/>',
      '<svg fill="currentColor"/>',
    );
    // raw keeps the removed value, highlighted, and never shows the new one
    expect(raw).toContain('<span class="del">');
    expect(raw).toContain('#000');
    expect(raw).not.toContain('currentColor');
    // transformed keeps the added value, highlighted, and never shows the old one
    expect(transformed).toContain('<span class="ins">');
    expect(transformed).toContain('currentColor');
    expect(transformed).not.toContain('#000');
  });

  it('escapes the angle brackets of the SVG markup', () => {
    const { raw } = computeDiffHtml('<svg/>', '<svg fill="currentColor"/>');
    expect(raw).toContain('&lt;svg');
    expect(raw).not.toMatch(/<svg/);
  });
});
