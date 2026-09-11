import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Reveal, Section, SectionHeading } from '../components/primitives';
import { useSiteContent } from '../lib/queries/siteContent';
import Icon from '../components/Icon';

function Step({ item, index, total }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.82', 'start 0.35'],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.32, 1]);
  const x = useTransform(scrollYProgress, [0, 1], [18, 0]);
  const dot = useTransform(scrollYProgress, [0, 1], [0.4, 1]);

  return (
    <motion.article
      ref={ref}
      style={{ opacity }}
      className="relative grid grid-cols-[auto_1fr] gap-x-6 pb-16 sm:gap-x-10 lg:pb-24"
    >
      {/* rail */}
      <div className="relative flex flex-col items-center">
        <motion.span
          style={{ scale: dot }}
          className="relative z-10 grid size-12 shrink-0 place-items-center rounded-full border border-line bg-surface font-mono text-[11px] tracking-widest text-ink"
        >
          {item.step}
          <span className="absolute inset-0 rounded-full bg-rose-200 blur-lg" />
        </motion.span>
        {index < total - 1 && (
          <span className="mt-2 w-px flex-1 bg-gradient-to-b from-line via-line to-transparent" />
        )}
      </div>

      <motion.div style={{ x }} className="pt-1.5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h3 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-tight tracking-tight text-ink">
            {item.title}
          </h3>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink">
            {item.detail}
          </span>
        </div>
        <p className="mt-4 max-w-[54ch] text-[16.5px] leading-relaxed text-ink-3">{item.body}</p>
      </motion.div>
    </motion.article>
  );
}

export default function Approach() {
  // This section's headline is editable from the admin panel (key
  // "approach.headline"). It used to be hard-coded, so the field existed in the
  // CMS but changing it did nothing on the site.
  const content = useSiteContent('approach');
  const process = Array.isArray(content.steps) ? content.steps : [];
  const pillars = Array.isArray(content.pillars) ? content.pillars : [];

  return (
    <Section id="approach" className="py-32 sm:py-44 lg:py-56">
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.headline}
        lead={content.lead}
      />

      <div className="mt-24 grid gap-16 lg:mt-36 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
        <div>
          {process.map((item, i) => (
            <Step key={`${item.step}-${i}`} item={item} index={i} total={process.length} />
          ))}
        </div>

        <div className="lg:sticky lg:top-28 lg:h-fit">
          <div className="glass rounded-4xl p-8 shadow-[var(--shadow-lift)] ring-1 ring-rose-200/30 sm:p-10">
            <p className="font-display text-2xl leading-snug tracking-tight text-ink">
              {content.pillars_title}
            </p>
            <ul className="mt-8 flex flex-col gap-8">
              {pillars.map((p, i) => (
                <Reveal key={`${p.title}-${i}`} delay={i * 0.1} as="li">
                  <div className="flex gap-4">
                    <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border border-rose-300 bg-rose-100 text-ink">
                      <Icon name={p.icon} size={18} />
                    </span>
                    <div>
                      <h4 className="text-[15px] font-medium tracking-tight text-ink">
                        {p.title}
                      </h4>
                      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">{p.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}
