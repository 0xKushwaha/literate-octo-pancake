import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ACCEPTED_IMAGE_TYPES, uploadImage } from '../../lib/queries/media';

/**
 * Pick a picture: choose a file, and that is the whole interaction.
 *
 * There was a "paste an image link" box next to the upload button for one
 * afternoon and it was removed on purpose. Every link people reach for — a
 * Google Drive share, a Google Photos album, an Unsplash photo page — is a
 * *web page* that displays the picture rather than the picture itself, so an
 * <img> given one draws a broken icon. That is not a thing an editor can be
 * expected to know, and the workarounds (rewriting known share links, naming
 * the service in the error) each only covered the cases we had thought of.
 * Uploading has none of that surface: the file goes into the practice's own
 * storage and the URL is one this code wrote.
 *
 * Alt text is a field rather than a nicety: an article cover that fails to
 * load, or a reader using a screen reader, gets whatever is typed here. Left
 * empty the picture is marked decorative (`alt=""`), which is the correct and
 * honest answer for a photograph that repeats the headline.
 */

/**
 * Shown instead of the controls when the database cannot store a cover yet.
 *
 * This replaced a post-save toast, which was accurate and useless: the field
 * looked like it worked and the picture was only reported lost after Save. A
 * field that cannot keep what you give it should not accept it.
 */
function NotReadyNotice({ onRecheck, checking }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
      <p className="text-[12px] font-medium text-amber-900">
        Pictures need one setup step
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-amber-800">
        Open the Supabase dashboard → <strong>SQL Editor</strong> → New query, paste the contents of{' '}
        <code className="rounded bg-amber-100 px-1 py-px font-mono text-[10.5px]">
          database/migrations/008_article_images.sql
        </code>{' '}
        and press Run. It adds the cover columns and creates the bucket uploads go into.
      </p>
      <button
        type="button"
        onClick={onRecheck}
        disabled={checking}
        className="mt-2 rounded-lg border border-amber-400 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
      >
        {checking ? 'Checking…' : 'I have run it — check again'}
      </button>
    </div>
  );
}

export default function ImageField({
  url,
  alt,
  onChange,
  folder = 'articles',
  label = 'Cover image',
  hint = 'Shown on the blog cards, the homepage and at the top of the article.',
  ready = true,
  canUpload = true,
  onRecheck,
  checking = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);
  const fileRef = useRef(null);

  const set = (nextUrl, nextAlt) => onChange({ url: nextUrl, alt: nextAlt ?? alt ?? '' });

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadImage(file, folder);
      setBroken(false);
      set(publicUrl);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err?.message || 'Could not upload that image.', { duration: 7000 });
    } finally {
      setUploading(false);
      // Clear the input, or choosing the same file twice in a row does nothing.
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // `null` is "could not tell" — offline, or an error that was not about a
  // missing column. Assume it works rather than nag about a migration that may
  // well have been run.
  if (ready === false) {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
        <NotReadyNotice onRecheck={onRecheck} checking={checking} />
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>

      {url ? (
        <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {broken ? (
            // An upload URL that stops loading means the file went away, or an
            // older article is still carrying a link from before this field
            // was upload-only. Either way the fix is the same.
            <p className="px-3 py-6 text-center text-[11.5px] leading-relaxed text-gray-600">
              This picture is no longer loading. Remove it and upload the file again.
            </p>
          ) : (
            <img
              src={url}
              alt=""
              className="block h-32 w-full object-cover"
              onError={() => setBroken(true)}
              onLoad={() => setBroken(false)}
            />
          )}
          <button
            type="button"
            onClick={() => { setBroken(false); set('', ''); }}
            className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition hover:bg-white hover:text-red-600"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 px-3 py-5 text-center">
          <p className="text-[11.5px] text-gray-400">No image yet</p>
        </div>
      )}

      {/* Without this the panel is a placeholder and an alt-text box with no
          way to do anything, and no clue why — which is exactly how demo mode
          renders, since uploading needs the live database. */}
      {!canUpload && (
        <p className="mt-2 text-[11px] text-gray-400">
          Uploading needs the live database, so it is unavailable here.
        </p>
      )}

      {canUpload && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700 disabled:opacity-40"
          >
            {uploading ? 'Uploading…' : url ? 'Replace image' : 'Upload image'}
          </button>
          <span className="text-[11px] text-gray-400">JPG, PNG, WebP or GIF · up to 10 MB</span>
        </div>
      )}


      <input
        type="text"
        value={alt ?? ''}
        onChange={(e) => set(url ?? '', e.target.value)}
        placeholder="What does the picture show? (for screen readers)"
        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
      />

      {hint && <p className="mt-1.5 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}
