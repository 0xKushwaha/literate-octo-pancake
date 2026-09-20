/**
 * @vitest-environment jsdom
 *
 * prepareImageForUpload() runs entirely on browser APIs (createImageBitmap,
 * <canvas>) that jsdom does not implement, so every test here stubs those out
 * itself rather than pulling in the `canvas` package — the point of these
 * tests is the *decision logic* (skip GIFs, leave right-sized files alone,
 * shrink oversized ones, never re-encode a PNG to something lossy, fall back
 * to the original on any failure), not real pixel output.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let bitmapSize = { width: 800, height: 600 };
let blobSize = 100 * 1024; // what canvas.toBlob() "produces", in bytes
let webpSupported = true;
let createImageBitmapImpl;
let lastCanvas; // set by the toBlob stub below, so a test can assert the shrink size

function installBrowserStubs() {
  createImageBitmapImpl = vi.fn(async () => ({
    width: bitmapSize.width,
    height: bitmapSize.height,
    close: vi.fn(),
  }));
  globalThis.createImageBitmap = createImageBitmapImpl;

  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() }));
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() =>
    webpSupported ? 'data:image/webp;base64,AAAA' : 'data:image/png;base64,AAAA',
  );
  HTMLCanvasElement.prototype.toBlob = vi.fn(function toBlob(cb, type) {
    // Recorded so a test can assert the canvas was sized for the shrink.
    lastCanvas = { width: this.width, height: this.height, type };
    cb(new Blob([new Uint8Array(blobSize)], { type }));
  });
}

let prepareImageForUpload;

beforeEach(async () => {
  bitmapSize = { width: 800, height: 600 };
  blobSize = 100 * 1024;
  webpSupported = true;
  installBrowserStubs();
  vi.resetModules();
  ({ prepareImageForUpload } = await import('../src/lib/imageResize.js'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeFile({ name, type, size }) {
  return new File([new Uint8Array(size)], name, { type });
}

describe('prepareImageForUpload', () => {
  it('leaves GIFs alone entirely — no decode is even attempted', async () => {
    const gif = makeFile({ name: 'party.gif', type: 'image/gif', size: 3 * 1024 * 1024 });
    const out = await prepareImageForUpload(gif);
    expect(out).toBe(gif);
    expect(createImageBitmapImpl).not.toHaveBeenCalled();
  });

  it('leaves a small, right-sized JPEG unchanged', async () => {
    bitmapSize = { width: 800, height: 600 }; // well under MAX_DIMENSION
    const small = makeFile({ name: 'thumb.jpg', type: 'image/jpeg', size: 200 * 1024 }); // under RESIZE_ABOVE_BYTES
    const out = await prepareImageForUpload(small);
    expect(out).toBe(small);
    expect(HTMLCanvasElement.prototype.toBlob).not.toHaveBeenCalled();
  });

  it('shrinks a JPEG whose dimensions exceed MAX_DIMENSION, preserving aspect ratio', async () => {
    bitmapSize = { width: 4000, height: 3000 }; // long edge 4000, scale to 2400 -> 1800
    blobSize = 500 * 1024; // smaller than the original, so the resize is kept
    const big = makeFile({ name: 'phone-photo.jpg', type: 'image/jpeg', size: 6 * 1024 * 1024 });
    const out = await prepareImageForUpload(big);

    expect(out).not.toBe(big);
    expect(out.size).toBe(blobSize);
    expect(out.type).toBe('image/webp');
    expect(out.name).toBe('phone-photo.webp');
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledTimes(1);
    expect(lastCanvas).toEqual({ width: 2400, height: 1800, type: 'image/webp' });
  });

  it('shrinks a JPEG that is just heavy (bytes), even if its dimensions are already small', async () => {
    bitmapSize = { width: 1200, height: 900 }; // under MAX_DIMENSION
    blobSize = 400 * 1024;
    const heavy = makeFile({ name: 'scan.jpg', type: 'image/jpeg', size: 2 * 1024 * 1024 }); // over RESIZE_ABOVE_BYTES
    const out = await prepareImageForUpload(heavy);
    expect(out).not.toBe(heavy);
    expect(out.type).toBe('image/webp');
  });

  it('falls back to JPEG when the browser cannot encode WebP', async () => {
    webpSupported = false;
    bitmapSize = { width: 4000, height: 2000 };
    blobSize = 500 * 1024;
    const big = makeFile({ name: 'wide.jpg', type: 'image/jpeg', size: 5 * 1024 * 1024 });
    const out = await prepareImageForUpload(big);
    expect(out.type).toBe('image/jpeg');
    expect(out.name).toBe('wide.jpg');
  });

  it('keeps a small PNG lossless even when it is heavy in bytes', async () => {
    bitmapSize = { width: 900, height: 500 }; // under MAX_DIMENSION
    const png = makeFile({ name: 'diagram.png', type: 'image/png', size: 3 * 1024 * 1024 }); // heavy, but PNG
    const out = await prepareImageForUpload(png);
    expect(out).toBe(png); // untouched: never re-encoded to something lossy
    expect(HTMLCanvasElement.prototype.toBlob).not.toHaveBeenCalled();
  });

  it('still shrinks an oversized PNG, but keeps it PNG (lossless)', async () => {
    bitmapSize = { width: 5000, height: 2500 }; // oversized
    blobSize = 900 * 1024;
    const png = makeFile({ name: 'infographic.png', type: 'image/png', size: 4 * 1024 * 1024 });
    const out = await prepareImageForUpload(png);
    expect(out).not.toBe(png);
    expect(out.type).toBe('image/png');
    expect(out.name).toBe('infographic.png');
  });

  it('returns the original file when re-encoding would not actually shrink it', async () => {
    bitmapSize = { width: 4000, height: 3000 };
    const big = makeFile({ name: 'already-tiny.jpg', type: 'image/jpeg', size: 50 * 1024 });
    blobSize = 80 * 1024; // "resized" output would be bigger than the 50KB original
    const out = await prepareImageForUpload(big);
    expect(out).toBe(big);
  });

  it('never throws and falls back to the original file when decoding fails', async () => {
    globalThis.createImageBitmap = vi.fn(async () => { throw new Error('corrupt image'); });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const file = makeFile({ name: 'broken.jpg', type: 'image/jpeg', size: 2 * 1024 * 1024 });
    const out = await prepareImageForUpload(file);
    expect(out).toBe(file);
    expect(warn).toHaveBeenCalled();
  });

  it('passes non-image files straight through', async () => {
    const pdf = makeFile({ name: 'notes.pdf', type: 'application/pdf', size: 1024 });
    const out = await prepareImageForUpload(pdf);
    expect(out).toBe(pdf);
    expect(createImageBitmapImpl).not.toHaveBeenCalled();
  });
});
