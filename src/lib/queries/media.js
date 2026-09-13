import { supabase, isDemo } from '../supabase';

/**
 * Uploading pictures for the blog.
 *
 * The bucket and its policies are created by migration 008: public read
 * (these are pictures on a public marketing site, and a signed URL would
 * expire and break every published article), admin-only write.
 *
 * Every failure here is turned into a sentence an editor can act on. The one
 * that matters is a missing bucket, which means 008 has not been run — and
 * the answer to that is "paste a link instead", not "ask a developer", which
 * is why the editor keeps the URL box next to the upload button.
 */
const BUCKET = 'media';

/** 10 MB, matching the limit the bucket itself enforces. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

/** A filename Supabase will accept and a human can still recognise later. */
function safeName(name) {
  const dot = String(name ?? '').lastIndexOf('.');
  const stem = (dot > 0 ? name.slice(0, dot) : String(name ?? 'image'))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'image';
  const ext = (dot > 0 ? name.slice(dot + 1) : 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  // The random suffix is not decoration: two people uploading "cover.jpg" in
  // the same second would otherwise collide, and `upsert: false` would fail
  // the second one rather than quietly overwrite the first.
  return `${stem}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;
}

function friendlyError(err) {
  const text = `${err?.message ?? ''} ${err?.error ?? ''}`.toLowerCase();
  if (text.includes('bucket not found') || text.includes('does not exist')) {
    return new Error(
      'Image storage is not set up yet — run migration 008 in the Supabase SQL editor. Until then you can paste an image link instead.',
    );
  }
  if (text.includes('row-level security') || text.includes('unauthorized') || text.includes('not authorized')) {
    return new Error('This account is not allowed to upload images. Sign in as an admin and try again.');
  }
  if (text.includes('payload too large') || text.includes('maximum allowed size')) {
    return new Error('That image is too large. Keep it under 10 MB — a cover photo rarely needs more.');
  }
  return new Error(err?.message || 'Could not upload that image.');
}

/**
 * Uploads one image and returns the public URL to store on the article.
 *
 * @param {File} file
 * @param {string} folder  where it lands in the bucket, e.g. 'articles'
 */
export async function uploadImage(file, folder = 'articles') {
  if (!file) throw new Error('No file chosen.');
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('That file is not an image the site can show. Use a JPG, PNG, WebP, GIF or AVIF.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('That image is too large. Keep it under 10 MB — a cover photo rarely needs more.');
  }
  if (isDemo) {
    throw new Error('Uploading needs the live database. Paste an image link instead while in demo mode.');
  }

  const path = `${folder}/${safeName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    // A year: the filename carries a random suffix, so a given URL never
    // changes content and can be cached as long as the browser likes.
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw friendlyError(error);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('The image uploaded but the site could not work out its address.');
  return data.publicUrl;
}
