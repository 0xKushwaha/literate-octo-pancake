import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Button, EASE, Magnetic, Pill, SplitWords } from '../components/primitives';
import Icon from '../components/Icon';
import { credentials } from '../data/site';
import { useSiteContent } from '../lib/queries/siteContent';

const HERO_DEFAULTS = {
  tagline: 'Therapy that meets you where you are.',
  subheadline: 'Licensed clinicians, matched to what you\'re carrying.',
};

export default function Hero({ onBook }) {
  const content = useSiteContent('hero', HERO_DEFAULTS);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '45%']);
  const opacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const blur = useTransform(scrollYProgress, [0, 0.6], ['blur(0px)', 'blur(14px)']);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <section
      id="top"
      ref={ref}
      className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden pb-10 pt-28 sm:pb-14"
    >
      {/* warm aurora wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 70% 40%, rgba(54,228,207,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 30% 60%, rgba(160,110,255,0.06) 0%, transparent 55%),
            linear-gradient(170deg,
              color-mix(in oklab, var(--color-bg) 96%, transparent) 0%,
              color-mix(in oklab, var(--color-bg) 78%, transparent) 35%,
              transparent 65%),
            linear-gradient(to top, var(--color-bg) 0%, transparent 22%)
          `,
        }}
      />

      {/* mobile scrim */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 lg:hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,246,244,0.96) 0%, rgba(255,246,244,0.88) 35%, rgba(255,246,244,0.35) 70%, rgba(255,246,244,0.65) 100%)',
        }}
      />

      <motion.div
        style={{ y, opacity, filter: blur, scale }}
        className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-5 sm:px-8 lg:px-12"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.35, ease: EASE }}
          className="flex flex-wrap items-center gap-3"
        >
          <Pill tone="aqua">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-aqua-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-aqua-300" />
            </span>
            Accepting new clients
          </Pill>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-4">
            Next opening — tomorrow, 09:30
          </span>
        </motion.div>

        {/* Cinematic headline — inspired by BlueYard's massive type scale */}
        <h1 className="mt-8 max-w-[14ch] font-display text-[clamp(3.5rem,11vw,9.5rem)] leading-[0.9] tracking-[-0.04em]">
          <SplitWords text="Therapy that" delay={0.45} />
          <br />
          <SplitWords text="meets" delay={0.6} />
          {' '}
          <span className="text-aurora">
            <SplitWords text="you where" delay={0.72} />
          </span>
          <br />
          <span className="text-aurora">
            <SplitWords text="you are." delay={0.88} />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 1.25, ease: EASE }}
          className="mt-10 max-w-[48ch] text-pretty text-[17px] leading-relaxed text-ink-2 sm:text-[19px]"
        >
          {content.subheadline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.42, ease: EASE }}
          className="mt-12 flex flex-wrap items-center gap-3"
        >
          <Magnetic strength={0.25} className="w-full sm:w-auto">
            <Button
              variant="glow"
              size="lg"
              icon="arrow"
              onClick={onBook}
              className="w-full sm:w-auto"
            >
              Book your first session
            </Button>
          </Magnetic>
          <Button
            variant="ghost"
            size="lg"
            as="a"
            href="#approach"
            iconLeft="spark"
            className="w-full sm:w-auto"
          >
            See how it works
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.7 }}
          className="mt-14 flex flex-wrap items-center gap-x-7 gap-y-3"
        >
          {credentials.slice(0, 4).map((c) => (
            <span key={c} className="flex items-center gap-2 text-[13px] text-ink-4">
              <Icon name="check" size={13} className="text-aqua-700" />
              {c}
            </span>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.0 }}
        style={{ opacity }}
        className="mx-auto flex w-full max-w-[1400px] items-end justify-between px-5 sm:px-8 lg:px-12"
      >
        <a href="#approach" className="group flex items-center gap-3 text-ink-4 hover:text-ink-2">
          <span className="relative grid size-11 place-items-center overflow-hidden rounded-full border border-line">
            <motion.span
              animate={{ y: [-16, 16] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
              className="block h-5 w-px bg-gradient-to-b from-transparent via-aqua-400 to-transparent"
            />
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.24em]">Scroll to explore</span>
        </a>

        <div className="hidden text-right sm:block">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-ink-4">
            San Francisco · Telehealth in 14 states
          </p>
        </div>
      </motion.div>
    </section>
  );
}
