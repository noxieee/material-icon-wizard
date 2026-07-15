import { diffWordsWithSpace } from 'diff';

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Word-level diff of raw vs. transformed SVG source, rendered as escaped HTML
 * for a split view: the `raw` string wraps removed tokens in
 * `<span class="del">`, the `transformed` string wraps added tokens in
 * `<span class="ins">`. All source text is HTML-escaped; only these span tags
 * are introduced, so the result is safe to render.
 *
 * @returns {{ raw: string, transformed: string } | null} null if either side
 *   is missing (nothing to diff).
 */
export function computeDiffHtml(rawSvg, transformedSvg) {
  if (rawSvg == null || transformedSvg == null) return null;

  const parts = diffWordsWithSpace(rawSvg, transformedSvg);

  const raw = parts
    .filter((p) => !p.added)
    .map((p) =>
      p.removed ? `<span class="del">${escapeHtml(p.value)}</span>` : escapeHtml(p.value),
    )
    .join('');

  const transformed = parts
    .filter((p) => !p.removed)
    .map((p) => (p.added ? `<span class="ins">${escapeHtml(p.value)}</span>` : escapeHtml(p.value)))
    .join('');

  return { raw, transformed };
}
