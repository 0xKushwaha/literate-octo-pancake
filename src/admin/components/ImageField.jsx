import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ACCEPTED_IMAGE_TYPES, uploadImage } from '../../lib/queries/media';

/**
 * Pick a picture: upload one, or paste a link to one.
 *
 * Both, deliberately. Uploading is what someone actually wants — choose a file
 * and be done — but it needs the storage bucket from migration 008, and this
 * editor has to keep working on a database that has not had it run yet. So the
 * link box is not a fallback hidden behind an error; it sits under the button
 * and always works.
 *
 * Alt text is a field rather than a nicety: an article cover that fails to
 * load, or a reader using a screen reader, gets whatever is typed here. Left
 * empty the picture is marked decorative (`alt=""`), which is the correct and
 * honest answer for a photograph that repeats the headline.
 */
export default function ImageField({
  url,
  alt,
  onChange,
  folder = 'articles',
  label = 'Cover image',
  hint = 'Shown on the blog cards, the homepage and at the top of the article.',
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

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>

      {url ? (
        <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {broken ? (
            <p className="px-3 py-6 text-center text-[11.5px] text-gray-500">
              That link did not load as an image. Check the address, or upload a file instead.
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

      <input
        type="url"
        value={url ?? ''}
        onChange={(e) => { setBroken(false); set(e.target.value); }}
        placeholder="…or paste an image link (https://…)"
        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
      />

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
