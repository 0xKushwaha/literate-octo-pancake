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
 * Two buttons, on purpose. `primary` is the one action colour (admin:
 * brand.button_color), everything else is white with a hairline. Older
 * variant names map onto those two so nothing needs a rename.
 */
const PRIMARY = 'bg-[var(--button)] text-white hover:brightness-110 shadow-[var(--shadow-lift)]';
const SECONDARY = 'border border-line-2 bg-surface text-ink hover:border-ink hover:shadow-[var(--shadow-card)]';
const variants = {
  primary: PRIMARY,
  glow: PRIMARY,
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
        transition-[transform,box-shadow,background-color,border-color,filter] duration-200
        active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40
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
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="size-1.5 rounded-full bg-amber-500" />
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
    rose: 'border-rose-400/60 bg-rose-100 text-ink',
    blush: 'border-rose-300/60 bg-blush-100 text-ink',
    peach: 'border-peach-100 bg-peach-100 text-ink',
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

/** Lazy, non-shifting photo. `ratio` is a CSS aspect-ratio string. */
export function Photo({ src, alt = '', ratio = '4 / 3', className = '', priority = false }) {
  if (!src) return null;
  return (
    <div className={`overflow-hidden rounded-[2rem] bg-surface-2 ${className}`} style={{ aspectRatio: ratio }}>
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
}

/** Split header for every subpage: copy on the left, photo on the right. */
export function PageHeader({ eyebrow, title, lead, image, imageAlt = '', children }) {
  return (
    <div className="backdrop-soft">
      <Section className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
        <div>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="mt-4 font-display text-[clamp(2.4rem,5.5vw,4.4rem)] leading-[1.04] tracking-[-0.02em] text-ink">{title}</h1>
          {lead && <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">{lead}</p>}
          {children && <div className="mt-8 flex flex-wrap items-center gap-3">{children}</div>}
        </div>
        <Photo src={image} alt={imageAlt} ratio="5 / 4" priority />
      </Section>
    </div>
  );
}

/** "See everything →" link used under each homepage teaser. */
export function MoreLink({ to, children, className = '' }) {
  return (
    <Link to={to} className={`group inline-flex items-center gap-2 text-[15px] font-semibold text-ink ${className}`}>
      <span className="underline decoration-rose-300 decoration-2 underline-offset-4 group-hover:decoration-ink">{children}</span>
      <Icon name="arrow" size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}
