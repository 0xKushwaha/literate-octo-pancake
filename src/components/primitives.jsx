import { forwardRef, useEffect, useRef, useState } from 'react';
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

const variants = {
  primary: 'bg-ink text-white hover:bg-ink-2 shadow-[var(--shadow-lift)]',
  // Every colour in this palette is light, so the label is black and the
  // gradient carries the emphasis on its own.
  glow: 'text-ink bg-gradient-to-r from-rose-400 via-peach-100 to-amber-500 hover:brightness-105 shadow-[0_14px_36px_-14px_rgba(255,176,181,0.6),0_0_0_1px_rgba(0,0,0,0.08)]',
  ghost: 'bg-surface text-ink border border-line hover:border-line-2 hover:shadow-[var(--shadow-card)]',
  quiet: 'text-ink-3 hover:text-ink',
  outline: 'border border-line-2 bg-surface text-ink hover:border-rose-400',
};

const sizes = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-[3.5rem] px-7 text-[15.5px]',
};

export const Button = forwardRef(function Button(
  { children, variant = 'primary', size = 'md', icon, iconLeft, className = '', as: Tag = 'button', ...rest },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={`group relative inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight
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
      ? 'text-[clamp(2.5rem,5.5vw,4.5rem)]'
      : 'text-[clamp(2.1rem,4.2vw,3.4rem)]';
  return (
    <Reveal className={`${centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'} ${className}`}>
      {eyebrow && (
        <div className={centered ? 'flex justify-center' : ''}>
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      )}
      <h2 className={`mt-5 font-display leading-[1.02] tracking-[-0.025em] text-ink ${titleSize}`}>{title}</h2>
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] ${tones[tone] ?? tones.default} ${className}`}
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
