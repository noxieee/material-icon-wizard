import { parse, stringify } from 'svgson';

// Paint values we must NOT rewrite: keywords that either paint nothing or
// already defer to the cascade. `currentcolor` is included so a re-run is a
// no-op. `context-fill`/`context-stroke` are SVG2 context paints — leave them.
const PRESERVED_PAINT_KEYWORDS = new Set([
  'none',
  'transparent',
  'inherit',
  'currentcolor',
  'context-fill',
  'context-stroke',
]);

const PAINT_PROPS = ['fill', 'stroke'];

function isUrlPaint(value) {
  return typeof value === 'string' && value.trim().toLowerCase().startsWith('url(');
}

// A "real color" is anything that actually paints and is baked into the file:
// #hex, rgb()/rgba(), hsl()/hsla(), or a named color. Those become currentColor.
function isConvertibleColor(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  if (v === '') return false;
  if (PRESERVED_PAINT_KEYWORDS.has(v)) return false;
  if (v.startsWith('url(')) return false;
  return true;
}

// Transform a set of CSS declarations (the body between `;`s of an inline
// `style="..."` attribute, or inside one `{ }` block of a <style> element):
//   fill/stroke real color -> currentColor
//   fill/stroke url(#…)     -> left as-is, warned
//   color:                  -> dropped, so currentColor resolves to the
//                             consumer's CSS color, never a baked-in value
// Preserves the original property text (whitespace/casing) for untouched decls.
function transformDeclarations(declBlock, warnings, context) {
  return declBlock
    .split(';')
    .map((decl) => {
      if (decl.trim() === '') return decl;
      const colon = decl.indexOf(':');
      if (colon === -1) return decl;
      const prop = decl.slice(0, colon).trim().toLowerCase();
      const rawValue = decl.slice(colon + 1);
      const value = rawValue.trim();

      if (prop === 'color') return null; // drop declaration entirely

      if (prop === 'fill' || prop === 'stroke') {
        if (isUrlPaint(value)) {
          warnings.push(`${context}: ${prop} "${value}" left as-is (url paint / gradient)`);
          return decl;
        }
        if (isConvertibleColor(value)) {
          return `${decl.slice(0, colon)}:currentColor`;
        }
      }
      return decl;
    })
    .filter((decl) => decl !== null)
    .join(';');
}

// Rewrite fill/stroke/color inside the body of every `{ ... }` rule of a
// <style> block. Selectors (outside braces) are left untouched, so pseudo-class
// colons like `a:hover` are never mistaken for declarations.
function transformCssText(css, warnings) {
  return css.replace(/\{([^}]*)\}/g, (_whole, body) => {
    return `{${transformDeclarations(body, warnings, '<style> block')}}`;
  });
}

function transformElement(node, warnings) {
  if (node.name === 'style') {
    for (const child of node.children ?? []) {
      if (child.type === 'text' && typeof child.value === 'string') {
        child.value = transformCssText(child.value, warnings);
      }
    }
    return; // a <style> element carries no paint attributes worth touching
  }

  const attrs = node.attributes ?? {};

  for (const prop of PAINT_PROPS) {
    const value = attrs[prop];
    if (value === undefined) continue; // absent -> inherits, leave it
    if (isUrlPaint(value)) {
      warnings.push(`<${node.name}> ${prop}="${value}" left as-is (url paint / gradient)`);
    } else if (isConvertibleColor(value)) {
      attrs[prop] = 'currentColor';
    }
  }

  if (typeof attrs.style === 'string') {
    attrs.style = transformDeclarations(attrs.style, warnings, `<${node.name}> style`);
  }
}

function walk(node, warnings) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'element') transformElement(node, warnings);
  for (const child of node.children ?? []) walk(child, warnings);
}

/**
 * Normalize an SVG so its paint follows the CSS `color` property via
 * `currentColor`, for both filled and outlined icons.
 *
 * The single rule is convert-never-introduce: on every element, each existing
 * fill/stroke real color becomes `currentColor`; `none`/`transparent`/`inherit`
 * and absent paints are left untouched (so no unwanted fill/outline appears);
 * `url(#…)` paints are left and warned about.
 *
 * The root `<svg>` gets `fill="currentColor"` only when it has no fill of its
 * own, so elements with no explicit fill (the common Material case) inherit the
 * CSS color instead of SVG's initial black. Root `stroke` is never added.
 *
 * Output is serialized from the parsed `<svg>` node, which drops any XML
 * prolog, DOCTYPE, or leading comments for free.
 *
 * @param {string} svgText raw SVG source
 * @returns {Promise<{ svg: string, warnings: string[] }>}
 */
export async function normalizeSvg(svgText) {
  const warnings = [];
  let root;
  try {
    root = await parse(svgText);
  } catch (err) {
    throw new Error(`Could not parse SVG: ${err.message}`, { cause: err });
  }
  if (!root || root.name !== 'svg') {
    throw new Error('Input does not contain a root <svg> element');
  }

  walk(root, warnings);

  root.attributes = root.attributes ?? {};
  // Fix SVG's black-by-default inheritance without clobbering an explicit
  // non-painting root fill (walk has already converted a real color here).
  if (root.attributes.fill === undefined) {
    root.attributes.fill = 'currentColor';
  }

  return { svg: stringify(root), warnings };
}
