import { forwardRef, useEffect, useRef, useState } from 'react';
import { motion, useInView as useMotionInView, useMotionValue, useSpring } from 'motion/react';
import Icon from './Icon';

/* ---------------------------------------------------------------- Reveal */

export const EASE = [0.16, 1, 0.3, 1];

/** Fades + lifts children into view once. */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  duration = 0.9,
  className = '',
  as = 'div',
  amount = 0.25,
  ...rest
}) {
  const MotionTag = motion[as] ?? motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

/** Staggers direct children on entry. */
export function Stagger({ children, className = '', delay = 0, step = 0.08, ...rest }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: step, delayChildren: delay } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE } },
};

export function StaggerItem({ children, className = '', ...rest }) {
  return (
    <motion.div className={className} variants={staggerItem} {...rest}>
      {children}
    </motion.div>
  );
}

/** Word-by-word headline reveal with a soft blur-in. */
export function SplitWords({ text, className = '', delay = 0, step = 0.055, once = true }) {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((word, i) => (
        // The observer has to sit on the UNclipped wrapper: a child parked at
        // y:110% is clipped away entirely, and a fully clipped element never
        // reports as intersecting — so the words would never animate in.
        <motion.span
          key={`${word}-${i}`}
          className="inline-block overflow-hidden align-bottom"
          initial="hidden"
          whileInView="show"
          viewport={{ once, amount: 0.1 }}
        >
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: '110%', opacity: 0, filter: 'blur(8px)' },
              show: { y: '0%', opacity: 1, filter: 'blur(0px)' },
            }}
            transition={{ duration: 1, delay: delay + i * step, ease: EASE }}
          >
            {word}
            {i < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </motion.span>
      ))}
    </span>
  );
}

/* ---------------------------------------------------------------- Magnetic */

/** Element leans toward the cursor. Disabled for coarse pointers. */
export function Magnetic({ children, strength = 0.35, className = '' }) {
  const ref = useRef(null);
  const x = useSpring(useMotionValue(0), { stiffness: 240, damping: 18, mass: 0.35 });
  const y = useSpring(useMotionValue(0), { stiffness: 240, damping: 18, mass: 0.35 });

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia('(pointer: fine)').matches) return;

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      x.set((e.clientX - (r.left + r.width / 2)) * strength);
      y.set((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const onLeave = () => {
      x.set(0);
      y.set(0);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [strength, x, y]);

  return (
    <motion.div ref={ref} style={{ x, y }} className={className}>
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- Button */

const variants = {
  primary:
    'bg-ink text-white hover:bg-[#161e33] shadow-[var(--shadow-lift)]',
  glow: 'text-white bg-gradient-to-r from-aqua-500 via-iris-500 to-violet-500 hover:brightness-110 shadow-[0_18px_48px_-16px_rgba(79,70,229,0.50),0_0_0_1px_rgba(79,70,229,0.15)] hover:shadow-[0_22px_56px_-14px_rgba(79,70,229,0.60),0_0_0_1px_rgba(79,70,229,0.2)]',
  ghost: 'glass text-ink hover:bg-surface hover:shadow-[var(--shadow-card)]',
  quiet: 'text-ink-3 hover:text-ink',
  outline: 'border border-line-2 bg-surface text-ink hover:border-aqua-500 hover:text-aqua-700',
};

const sizes = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-[3.75rem] px-8 text-[15.5px]',
};

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconLeft,
    className = '',
    as: Tag = 'button',
    ...rest
  },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={`group relative inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight
        transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
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
          className="shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1"
        />
      )}
    </Tag>
  );
});

/* ---------------------------------------------------------------- Section */

export function Eyebrow({ children, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="h-px w-8 bg-gradient-to-r from-aqua-400/80 to-transparent" />
      <span className="eyebrow">{children}</span>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, lead, align = 'left', className = '' }) {
  const centered = align === 'center';
  return (
    <div className={`${centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'} ${className}`}>
      {eyebrow && (
        <Reveal>
          <div className={centered ? 'flex justify-center' : ''}>
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
        </Reveal>
      )}
      <h2 className="mt-6 font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.98] tracking-[-0.03em] text-ink">
        <SplitWords text={title} />
      </h2>
      {lead && (
        <Reveal delay={0.15}>
          <p
            className={`mt-6 text-[17px] leading-relaxed text-ink-2 ${centered ? 'mx-auto max-w-xl' : 'max-w-xl'}`}
          >
            {lead}
          </p>
        </Reveal>
      )}
    </div>
  );
}

export function Section({ id, children, className = '', ...rest }) {
  return (
    <section
      id={id}
      className={`relative mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-12 ${className}`}
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
    aqua: 'border-aqua-300/60 bg-aqua-100/80 text-aqua-700 shadow-[0_0_12px_-3px_rgba(45,212,191,0.25)]',
    iris: 'border-iris-400/60 bg-iris-100/80 text-iris-600 shadow-[0_0_12px_-3px_rgba(79,70,229,0.2)]',
    violet: 'border-violet-400/60 bg-violet-100/80 text-violet-600 shadow-[0_0_12px_-3px_rgba(124,58,237,0.2)]',
    coral: 'border-coral-500 bg-coral-100 text-coral-700',
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
export function Counter({ value, decimals = 0, suffix = '', duration = 1900 }) {
  const ref = useRef(null);
  const inView = useMotionInView(ref, { once: true, amount: 0.5 });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      // expo-out
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setShown(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/** Card that tilts subtly toward the pointer, with a light that follows it. */
export function TiltCard({ children, className = '', max = 6, glow = true }) {
  const ref = useRef(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 22 });
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 22 });
  const [light, setLight] = useState({ x: 50, y: 50, on: false });

  const onMove = (e) => {
    const el = ref.current;
    if (!el || !window.matchMedia('(pointer: fine)').matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * max * 2);
    rx.set(-(py - 0.5) * max * 2);
    setLight({ x: px * 100, y: py * 100, on: true });
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
    setLight((l) => ({ ...l, on: false }));
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      className={`relative ${className}`}
    >
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500"
          style={{
            opacity: light.on ? 1 : 0,
            background: `radial-gradient(480px circle at ${light.x}% ${light.y}%, color-mix(in oklab, var(--color-aqua-400) 18%, transparent), transparent 58%)`,
          }}
        />
      )}
      {children}
    </motion.div>
  );
}
