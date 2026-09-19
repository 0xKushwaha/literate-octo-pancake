import { supabase, isDemo } from '../supabase';

/**
 * Uploading pictures for the blog.
 *
 * The bucket and its policies are created by migration 008: public read
 * (these are pictures on a public marketing site, and a signed URL would
 * expire and break every published article), admin-only write.
 *
 * Every failure here is turned into a sentence an editor can act on. The one
 * that matters is a missing bucket, which means migration 008 has not been
 * run — and since uploading is now the only way to put a picture on an
 * article, that message has to name the file to run rather than suggest a
 * workaround there no longer is.
 */
const BUCKET = 'media';

/** 10 MB, matching the limit the bucket itself enforces. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

/** 20 MB, matching what migration 012 raised the bucket to. */
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
  'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm',
];

/** A filename Supabase will accept and a human can still recognise later. */
function safeName(name) {
  const dot = String(name ?? '').lastIndexOf('.');
  const stem = (dot > 0 ? name.slice(0, dot) : String(name ?? 'file'))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'file';
  // The extension is kept as given: it is what tells Supabase, the CDN and the
  // browser what the file is. Only the fallback differs by caller, and both
  // callers always pass a real filename.
  const ext = (dot > 0 ? name.slice(dot + 1) : 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  // The random suffix is not decoration: two people uploading "cover.jpg" in
  // the same second would otherwise collide, and `upsert: false` would fail
  // the second one rather than quietly overwrite the first.
  return `${stem}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;
}

function friendlyError(err) {
  const text = `${err?.message ?? ''} ${err?.error ?? ''}`.toLowerCase();
  if (text.includes('bucket not found') || text.includes('does not exist')) {
    return new Error(
      'Image storage is not set up yet — run database/migrations/008_article_images.sql in the Supabase SQL editor, then try again.',
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
    throw new Error('Uploading needs the live database — it does nothing in demo mode.');
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

/**
 * Uploads one audio clip and returns its public URL.
 *
 * Same bucket and same policies as the pictures — migration 012 only widens
 * the list of mime types it accepts. A browser reports m4a inconsistently
 * (audio/mp4, audio/x-m4a, and occasionally nothing at all), so the extension
 * is the fallback check rather than trusting file.type alone.
 */
export async function uploadAudio(file, folder = 'testimonials') {
  if (!file) throw new Error('No file chosen.');

  const byExtension = /\.(mp3|m4a|aac|wav|ogg|oga|webm)$/i.test(file.name || '');
  if (!ACCEPTED_AUDIO_TYPES.includes(file.type) && !byExtension) {
    throw new Error('That file is not audio the site can play. Use an MP3, M4A, WAV, OGG or WebM.');
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error('That clip is too large. Keep it under 20 MB — a minute or two of speech is far smaller.');
  }
  if (isDemo) {
    throw new Error('Uploading needs the live database — it does nothing in demo mode.');
  }

  const path = `${folder}/${safeName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || 'audio/mpeg',
  });
  if (error) throw friendlyAudioError(error);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('The clip uploaded but the site could not work out its address.');
  return data.publicUrl;
}

/** The image messages name the wrong migration for an audio failure. */
function friendlyAudioError(err) {
  const text = `${err?.message ?? ''} ${err?.error ?? ''}`.toLowerCase();
  if (text.includes('bucket not found') || text.includes('does not exist')) {
    return new Error('Storage is not set up yet — run database/migrations/008_article_images.sql, then 012_audio_testimonials.sql.');
  }
  if (text.includes('mime') || text.includes('content type') || text.includes('invalid_mime')) {
    return new Error('The storage bucket is not accepting audio yet — run database/migrations/012_audio_testimonials.sql in the Supabase SQL editor.');
  }
  if (text.includes('row-level security') || text.includes('unauthorized') || text.includes('not authorized')) {
    return new Error('This account is not allowed to upload. Sign in as an admin and try again.');
  }
  if (text.includes('payload too large') || text.includes('maximum allowed size')) {
    return new Error('That clip is too large. Keep it under 20 MB.');
  }
  return new Error(err?.message || 'Could not upload that clip.');
}
