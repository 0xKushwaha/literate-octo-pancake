import { useState } from 'react';

/**
 * A drop-in replacement for a public-facing <img>. Two things it does that a
 * plain <img> does not:
 *
 *  - Never shows the browser's broken-picture icon. If the file 404s — moved,
 *    deleted from storage, a stale pasted link — this renders nothing rather
 *    than a torn-corner icon, leaving whatever background colour the wrapping
 *    element already has. Every image on this site already sits inside a
 *    container with its own placeholder tint (the peach/sand/brand panel
 *    behind a card's cover) for exactly this reason, so "nothing" reads as
 *    a plain card rather than a broken one.
 *  - Takes a `focal` prop — a CSS object-position value such as "30% 70%" —
 *    and applies it as the crop point, so a subject that is not centred
 *    survives a fixed-aspect crop instead of being cut off.
 */
export default function Img({ src, alt, focal, style, onError, ...props }) {
  const [broken, setBroken] = useState(false);
  // Reset if the picture itself changes under us (an admin edit landing while
  // the page is open) — otherwise a src that once failed stays hidden forever,
  // even after it points at something new and perfectly good.
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) { setLastSrc(src); setBroken(false); }

  if (!src || broken) return null;
  return (
    <img
      src={src}
      alt={alt || ''}
      style={focal ? { objectPosition: focal, ...style } : style}
      onError={(e) => { setBroken(true); onError?.(e); }}
      {...props}
    />
  );
}
