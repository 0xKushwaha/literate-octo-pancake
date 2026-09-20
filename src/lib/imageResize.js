/**
 * Shrinks an oversized photo before it leaves the browser.
 *
 * A phone camera writes 4000×3000, 5–8 MB JPEGs, and every picture on this
 * site is cropped down to a card a few hundred pixels wide — the cover on a
 * blog card, an infographic thumbnail, a hero image inside an article body.
 * Uploading the original means every visitor's browser downloads the full
 * photo to show a sliver of it, which is the single biggest thing that could
 * be slowing these pages down. This runs before the file reaches
 * uploadImage(), so the fix applies everywhere ImageField and the rich-text
 * editor's image button are used, with no per-caller wiring.
 *
 * Two things are deliberately left alone:
 *  - GIFs, because re-encoding would collapse the animation to one frame.
 *  - A file that is already small and within bounds, because re-compressing
 *    a JPEG that is already well-optimised only loses quality for nothing,
 *    and a diagram or screenshot saved as PNG relies on lossless encoding to
 *    keep text and hard edges crisp — converting a small one to a lossy
 *    format is the wrong trade even at a high quality setting.
 */

const MAX_DIMENSION = 2400; // generous — nothing on this site shows a photo larger
const RESIZE_ABOVE_BYTES = 900 * 1024; // ~900KB: below this, leave a right-sized file alone
const WEBP_QUALITY = 0.85;

/** Decodes a file into a normalised {width, height, draw, close}. */
function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file).then((bitmap) => ({
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      close: () => bitmap.close(),
    }));
  }
  // Safari without createImageBitmap-on-Blob support: an <img> does the same job.
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      close: () => URL.revokeObjectURL(url),
    });
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

let webpSupport;
function supportsWebpEncoding() {
  if (webpSupport === undefined) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  }
  return webpSupport;
}

/**
 * Resizes/re-encodes `file` for upload, or returns it unchanged when that
 * would not help. Never throws: any failure along the way falls back to the
 * original file, because an upload that is a bit larger than ideal is a far
 * smaller problem than one that is blocked outright.
 */
export async function prepareImageForUpload(file) {
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/gif') return file;

  let decoded;
  try {
    decoded = await loadImage(file);
    const { width, height } = decoded;
    if (!width || !height) return file;

    const longEdge = Math.max(width, height);
    const oversized = longEdge > MAX_DIMENSION;
    const heavy = file.size > RESIZE_ABOVE_BYTES;
    // Small PNGs are left lossless; anything else that is already right-sized
    // is left exactly as it is.
    if (!oversized && (file.type === 'image/png' || !heavy)) return file;

    const scale = oversized ? MAX_DIMENSION / longEdge : 1;
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    decoded.draw(ctx, targetW, targetH);

    // PNG stays PNG — lossless, so a diagram's text stays sharp. Everything
    // else becomes WebP, which every browser this site supports both encodes
    // and displays, and falls back to JPEG on the rare one that cannot.
    const keepPng = file.type === 'image/png';
    const outType = keepPng ? 'image/png' : supportsWebpEncoding() ? 'image/webp' : 'image/jpeg';
    const quality = outType === 'image/png' ? undefined : WEBP_QUALITY;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, outType, quality));
    if (!blob || blob.size >= file.size) return file; // the re-encode did not actually help

    const ext = outType === 'image/webp' ? 'webp' : outType === 'image/jpeg' ? 'jpg' : 'png';
    const stem = file.name.replace(/\.[^./\\]+$/, '');
    return new File([blob], `${stem}.${ext}`, { type: outType, lastModified: Date.now() });
  } catch (err) {
    console.warn('[lumen] image resize skipped, uploading the original file', err);
    return file;
  } finally {
    decoded?.close?.();
  }
}
