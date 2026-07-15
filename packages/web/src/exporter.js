import { zipSync, strToU8 } from 'fflate';

function contentOf(item) {
  return item.transformedSvg ?? item.rawSvg;
}

function exportableFiles(items) {
  const files = {};
  for (const item of items) {
    if (item.status !== 'found') continue;
    const content = contentOf(item);
    if (content == null) continue;
    files[`${item.name}.svg`] = content;
  }
  return files;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Build the zip bytes for the exportable icons (pure, no side effects).
 * @returns {Uint8Array|null} null when nothing is exportable
 */
export function buildIconZip(items) {
  const files = exportableFiles(items);
  const names = Object.keys(files);
  if (names.length === 0) return null;
  const u8 = {};
  for (const name of names) u8[name] = strToU8(files[name]);
  return zipSync(u8);
}

/**
 * Primary export path (all browsers): bundle SVGs into a .zip and download it.
 * @returns {number} count of files zipped
 */
export function exportZip(items, filename = 'icons.zip') {
  const zipped = buildIconZip(items);
  if (!zipped) return 0;
  triggerDownload(new Blob([zipped], { type: 'application/zip' }), filename);
  return Object.keys(exportableFiles(items)).length;
}

/** Chrome/Edge only — is the File System Access API available? */
export function canWriteToFolder() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Enhancement path (Chrome/Edge): write SVGs straight into a chosen folder,
 * prompting once before overwriting any existing files (consistent with the CLI).
 * @returns {Promise<{ written: number, skipped: number }>}
 */
export async function exportToFolder(items) {
  const files = exportableFiles(items);
  const names = Object.keys(files);
  if (names.length === 0) return { written: 0, skipped: 0 };

  const dir = await window.showDirectoryPicker();

  const existing = [];
  for (const name of names) {
    try {
      await dir.getFileHandle(name);
      existing.push(name);
    } catch {
      // not found -> no collision
    }
  }
  if (existing.length > 0) {
    const ok = window.confirm(
      `${existing.length} file(s) already exist and will be overwritten:\n` +
        existing.map((n) => `- ${n}`).join('\n') +
        '\n\nContinue?',
    );
    if (!ok) return { written: 0, skipped: names.length };
  }

  let written = 0;
  for (const name of names) {
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(files[name]);
    await writable.close();
    written++;
  }
  return { written, skipped: 0 };
}
