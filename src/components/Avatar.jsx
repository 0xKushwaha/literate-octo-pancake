/**
 * Deterministic generated portrait stand-in, built from the site palette.
 *
 * It used to blend a dark navy base (hsl at 12-16% lightness) under two bright
 * blooms, with white initials on top. There is no dark colour in this palette,
 * so that base no longer exists — and a white initial on any of these pastels
 * is around 1.5:1, i.e. invisible. So the portrait is now a flat palette fill
 * with a second palette colour blooming across it, and black initials, which
 * clears 12:1 against the worst case.
 */
export default function Avatar({ name, hue = [172, 268], size = 'md', className = '' }) {
  const initials = String(name ?? '')
    .replace(/^(Dr|Mr|Ms|Mx)\.?\s+/i, '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('');

  // The data still describes people by a hue pair; this snaps each hue to the
  // nearest palette colour so the portraits cannot drift off-palette.
  const [h1 = 357, h2 = 45] = Array.isArray(hue) ? hue : [];
  const swatch = (h) => {
    const n = ((h % 360) + 360) % 360;
    if (n >= 340 || n < 15) return '#FFB0B5';
    if (n < 38) return '#F9DCC0';
    return '#FFBF00';
  };
  const c1 = swatch(h1);
  const c2 = swatch(h2);

  const sizes = {
    sm: 'size-10 text-[13px]',
    md: 'size-14 text-base',
    lg: 'size-20 text-xl',
    xl: 'size-28 text-2xl',
  };

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ${sizes[size]} ${className}`}
      style={{
        background: `
          radial-gradient(120% 120% at 22% 18%, ${c2}, transparent 62%),
          linear-gradient(150deg, ${c1}, ${c2})
        `,
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 mix-blend-overlay opacity-45"
        style={{
          background: `conic-gradient(from ${h1}deg, transparent, ${c2}, transparent 62%)`,
        }}
      />
      <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10" />
      <div className="absolute inset-0 grid place-items-center font-medium tracking-tight text-ink">
        {initials}
      </div>
    </div>
  );
}
