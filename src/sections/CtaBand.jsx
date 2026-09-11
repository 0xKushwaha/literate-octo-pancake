import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Button, Magnetic, Section, SplitWords } from '../components/primitives';
import Icon from '../components/Icon';
import { brand } from '../data/site';

export default function CtaBand({ onBook }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const glowY = useTransform(scrollYProgress, [0, 1], ['30%', '-30%']);

  return (
    <Section className="pb-36 pt-10 sm:pb-48">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-5xl border border-line bg-surface px-6 py-28 text-center sm:px-14 sm:py-40"
      >
        <motion.div
          aria-hidden
          style={{ y: glowY }}
          className="pointer-events-none absolute inset-x-0 top-1/2 h-[520px] -translate-y-1/2"
        >
          <div className="absolute left-1/2 top-1/2 size-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,176,181,0.35),transparent_62%)]" />
          <div className="absolute left-[62%] top-[46%] size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,191,0,0.30),transparent_62%)]" />
        </motion.div>
        <div aria-hidden className="pointer-events-none absolute inset-0 grid-lines opacity-40" />

        <div className="relative">
          <h2 className="mx-auto max-w-[18ch] font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[1.02] tracking-[-0.03em]">
            <SplitWords text="The hardest part is" />{' '}
            <span className="text-aurora">
              <SplitWords text="starting." delay={0.25} />
            </span>
          </h2>
          <p className="mx-auto mt-7 max-w-[46ch] text-[17px] leading-relaxed text-ink-2">
            Two minutes now, a matched therapist by tomorrow, a first session this week. You can
            change your mind at any point in that sequence.
          </p>

          <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
            <Magnetic strength={0.3}>
              <Button variant="glow" size="lg" icon="arrow" onClick={() => onBook?.()}>
                Book your first session
              </Button>
            </Magnetic>
            <Button
              variant="ghost"
              size="lg"
              as="a"
              href={`tel:${brand.phone.replace(/[^\d+]/g, '')}`}
              iconLeft="phone"
            >
              Or just call us
            </Button>
          </div>

          <p className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-4">
            <span className="flex items-center gap-2">
              <Icon name="check" size={12} className="text-ink" />
              Free 15-min intro call
            </span>
            <span className="flex items-center gap-2">
              <Icon name="check" size={12} className="text-ink" />
              Cancel any time
            </span>
            <span className="flex items-center gap-2">
              <Icon name="check" size={12} className="text-ink" />
              No card to browse
            </span>
          </p>
        </div>
      </div>
    </Section>
  );
}
