/**
 * Deterministic portrait stand-in, built from the site palette.
 *
 * Flat by design. The previous version blended a radial bloom over a linear
 * base with a conic overlay on top — three gradients in a circle 40 pixels
 * wide, which at that size is just mud. Each person now gets one solid
 * palette colour, picked from the hue pair the data already carries, with a
 * hairline ring and ink initials. The worst case is the amber, and black on
 * amber is 10.3:1.
 */
const SWATCHES = [
  'bg-brand-200',
  'bg-sand-100',
  'bg-brand-300',
  'bg-amber-500',
  'bg-brand-100',
  'bg-sand-50',
];

export default function Avatar({ name, hue = [172, 268], size = 'md', className = '' }) {
  const initials = String(name ?? '')
    .replace(/^(Dr|Mr|Ms|Mx)\.?\s+/i, '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('');

  // The data still describes people by a hue pair. Both hues go into the
  // index so two therapists who share a first hue can still differ, and the
  // result is stable for a given person across every page they appear on.
  const [h1 = 357, h2 = 45] = Array.isArray(hue) ? hue : [];
  const swatch = SWATCHES[Math.abs(Math.round(h1 / 37) + Math.round(h2 / 53)) % SWATCHES.length];

  const sizes = {
    sm: 'size-10 text-[13px]',
    md: 'size-14 text-base',
    lg: 'size-20 text-xl',
    xl: 'size-28 text-2xl',
  };

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full font-medium tracking-tight text-ink ring-1 ring-inset ring-black/10 ${swatch} ${sizes[size]} ${className}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
