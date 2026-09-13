import { forwardRef, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

/* ---------------------------------------------------------------- Reveal */

/** Shared easing (kept for the booking dialog, which still animates with motion). */
export const EASE = [0.16, 1, 0.3, 1];

/**
 * Fades + lifts children into view once, with CSS transitions driven by a
 * single IntersectionObserver. This replaced a motion/react implementation:
 * the animation library alone was ~45 KB of JavaScript on the homepage and
 * every reveal was a React re-render, which is a lot of work for "fade in".
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
  amount = 0.15,
  ...rest
}) {
  const [ref, inView] = useInViewOnce(amount);
  return (
    <Tag
      ref={ref}
      className={`reveal ${inView ? 'is-in' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Staggers direct children on entry. Children get their own `.reveal`. */
export function Stagger({ children, className = '', step = 0.07, amount = 0.1, as: Tag = 'div', ...rest }) {
  const [ref, inView] = useInViewOnce(amount);
  return (
    <Tag
      ref={ref}
      className={`stagger ${inView ? 'is-in' : ''} ${className}`}
      style={{ '--stagger-step': `${step}s` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({ children, className = '', as: Tag = 'div', ...rest }) {
  return (
    <Tag className={`reveal ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/** Kept for older call sites; a plain span now. */
export function SplitWords({ text, className = '' }) {
  return <span className={className}>{text}</span>;
}

/** Passthroughs — the pointer-tracking effects were removed for performance. */
export function Magnetic({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}
export function TiltCard({ children, className = '' }) {
  return <div className={`relative ${className}`}>{children}</div>;
}

function useInViewOnce(amount = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { setInView(true); return; }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      // Fire as soon as any part of the element clears the bottom edge: a
      // section scrolled to quickly should never sit blank while it waits.
      { threshold: Math.min(amount, 0.05), rootMargin: '0px 0px -4% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [amount]);
  return [ref, inView];
}

/* ---------------------------------------------------------------- Button */

/**
 * Three buttons, on purpose.
 *
 * `primary` is the brand colour with white type — the action on every light
 * page. `accent` is amber with black type, and exists only for the dark
 * closing band, where a teal button would disappear into the panel it sits
 * on. `secondary` is white with a hairline. Older variant names map onto
 * those, so nothing needs a rename.
 *
 * The lift on hover is two pixels and the press is a 3% squash: enough to
 * feel answered, not enough to move the layout.
 */
const PRIMARY =
  'bg-[var(--button)] text-white shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] hover:brightness-[1.08]';
const ACCENT =
  'bg-amber-500 text-ink shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] hover:brightness-[1.04]';
const SECONDARY =
  'border border-line-2 bg-surface text-ink hover:-translate-y-0.5 hover:border-ink hover:shadow-[var(--shadow-card)]';
const variants = {
  primary: PRIMARY,
  glow: PRIMARY,
  accent: ACCENT,
  secondary: SECONDARY,
  ghost: SECONDARY,
  outline: SECONDARY,
  quiet: 'text-ink-3 hover:text-ink',
};

const sizes = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-[3.4rem] px-7 text-[15.5px]',
};

export const Button = forwardRef(function Button(
  { children, variant = 'primary', size = 'md', icon, iconLeft, className = '', as: Tag = 'button', ...rest },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={`group relative inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight
        transition-[transform,box-shadow,background-color,border-color,filter] duration-200 ease-[var(--ease-out-expo)]
        active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {iconLeft && <Icon name={iconLeft} size={17} className="shrink-0" />}
      <span className="relative">{children}</span>
      {icon && (
        <Icon
          name={icon}
          size={17}
          className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
        />
      )}
    </Tag>
  );
});

/* ---------------------------------------------------------------- Section */

export function Eyebrow({ children, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* The one peach mark that repeats. Amber is spoken for — it means
          "notice this now" on the crisis banner and the closing band — and a
          section label is not an alarm. Peach reads warm at this size on
          every ground the site has, and it is four pixels wide, which is the
          brief for this colour. */}
      <span className="h-3 w-1 rounded-full bg-peach-200" />
      <span className="eyebrow">{children}</span>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, lead, align = 'left', className = '', size = 'md' }) {
  const centered = align === 'center';
  const titleSize =
    size === 'lg'
      ? 'text-[clamp(2.4rem,5vw,4rem)]'
      : 'text-[clamp(1.9rem,3.6vw,2.9rem)]';
  return (
    <Reveal className={`${centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'} ${className}`}>
      {eyebrow && (
        <div className={centered ? 'flex justify-center' : ''}>
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      )}
      <h2 className={`mt-4 font-display leading-[1.05] tracking-[-0.02em] text-ink ${titleSize}`}>{title}</h2>
      {lead && (
        <p className={`mt-5 text-[16.5px] leading-relaxed text-ink-3 ${centered ? 'mx-auto max-w-xl' : 'max-w-xl'}`}>
          {lead}
        </p>
      )}
    </Reveal>
  );
}

export function Section({ id, children, className = '', ...rest }) {
  return (
    <section
      id={id}
      className={`relative mx-auto w-full max-w-[1200px] scroll-mt-24 px-5 sm:px-8 lg:px-10 ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------- misc */

export function Pill({ children, className = '', tone = 'default' }) {
  const tones = {
    default: 'border-line bg-surface-2 text-ink-2',
    // `rose`/`blush`/`peach` are the names the old pastel palette used; they
    // are kept as aliases so every call site did not have to change when the
    // palette moved to teal.
    brand: 'border-brand-300 bg-brand-100 text-ink',
    rose: 'border-brand-300 bg-brand-100 text-ink',
    soft: 'border-brand-200/70 bg-brand-50 text-ink',
    blush: 'border-brand-200/70 bg-brand-50 text-ink',
    sand: 'border-sand-100 bg-sand-100 text-ink',
    peach: 'border-peach-200/60 bg-peach-100 text-ink',
    // For pills sitting on a coloured card. Every other tone is a fixed
    // colour and picks a fight with whatever is behind it — a pale blue pill
    // on a peach card reads as a mistake. This one is ink at a low alpha, so
    // it is the same relationship to its ground on white, blue, peach or sand.
    quiet: 'border-ink/10 bg-ink/[0.045] text-ink-2',
    amber: 'border-amber-500 bg-amber-500 text-ink',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tones[tone] ?? tones.default} ${className}`}
    >
      {children}
    </span>
  );
}

/** Counts up to `value` when scrolled into view. */
export function Counter({ value, decimals = 0, suffix = '', duration = 1400 }) {
  const [ref, inView] = useInViewOnce(0.5);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setShown(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/* ---------------------------------------------------------------- Pages */

/**
 * Lazy, non-shifting photo. `ratio` is a CSS aspect-ratio string.
 *
 * `framed` puts a flat brand-coloured panel behind the picture, offset down
 * and to the left. It is one solid colour — the point is to give the photo
 * an edge to sit against on a page that is otherwise all white cards, which
 * a gradient wash used to do and no longer does.
 */
export function Photo({ src, alt = '', ratio = '4 / 3', className = '', priority = false, framed = false }) {
  if (!src) return null;
  const img = (
    <div className="overflow-hidden rounded-[2rem] bg-surface-2 shadow-[var(--shadow-lift)]" style={{ aspectRatio: ratio }}>
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
  if (!framed) return <div className={className}>{img}</div>;
  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-4 -left-4 h-full w-full rounded-[2rem] bg-brand-200"
      />
      <div className="relative">{img}</div>
    </div>
  );
}

/**
 * Split header for every subpage: copy on the left, photo on the right.
 * The display size is capped well below the homepage's so a long headline
 * (they are all CMS fields) wraps to two or three lines, not five.
 */
export function PageHeader({ eyebrow, title, lead, image, imageAlt = '', children }) {
  return (
    <div className="backdrop-soft">
      <Section className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="mt-4 font-display text-[clamp(2.1rem,4.2vw,3.4rem)] leading-[1.06] tracking-[-0.02em] text-ink">{title}</h1>
          {lead && <p className="mt-5 max-w-[52ch] text-[16.5px] leading-relaxed text-ink-2">{lead}</p>}
          {children && <div className="mt-7 flex flex-wrap items-center gap-3">{children}</div>}
        </div>
        <Photo src={image} alt={imageAlt} ratio="4 / 3" priority framed />
      </Section>
    </div>
  );
}

/** Vertical rhythm for a section: tighter when a PageHeader sits right above it. */
export function sectionPad(withHeading) {
  return withHeading ? 'py-16 sm:py-24' : 'pb-16 pt-10 sm:pb-24 sm:pt-12';
}

/** "See everything →" link used under each homepage teaser. */
export function MoreLink({ to, children, className = '' }) {
  return (
    <Link to={to} className={`group inline-flex items-center gap-2 text-[15px] font-semibold text-ink ${className}`}>
      <span className="underline decoration-amber-500 decoration-2 underline-offset-4 transition-colors group-hover:decoration-ink">{children}</span>
      <Icon name="arrow" size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}
