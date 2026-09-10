/**
 * Deterministic generated portrait stand-in: layered conic + radial gradients
 * seeded from the person's hue pair, with their initials on top.
 * Keeps the page asset-free and consistent in tone with the 3D scene.
 */
export default function Avatar({ name, hue = [172, 268], size = 'md', className = '' }) {
  const initials = name
    .replace(/^(Dr|Mr|Ms|Mx)\.?\s+/i, '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

  const [h1, h2] = hue;
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
          radial-gradient(120% 120% at 22% 18%, hsl(${h1} 78% 62% / 0.95), transparent 58%),
          radial-gradient(110% 110% at 82% 78%, hsl(${h2} 74% 60% / 0.9), transparent 60%),
          linear-gradient(150deg, hsl(${h1} 40% 16%), hsl(${h2} 45% 12%))
        `,
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 mix-blend-overlay opacity-45"
        style={{
          background: `conic-gradient(from ${h1}deg, transparent, hsl(${h2} 90% 78% / 0.7), transparent 62%)`,
        }}
      />
      <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10" />
      <div className="absolute inset-0 grid place-items-center font-medium tracking-tight text-white drop-shadow-[0_1px_3px_rgba(10,16,32,0.35)]">
        {initials}
      </div>
    </div>
  );
}
