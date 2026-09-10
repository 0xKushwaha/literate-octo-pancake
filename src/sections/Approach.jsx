import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Reveal, Section, SectionHeading } from '../components/primitives';
import Icon from '../components/Icon';
import { process } from '../data/site';

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
          className="relative z-10 grid size-12 shrink-0 place-items-center rounded-full border border-line bg-surface font-mono text-[11px] tracking-widest text-aqua-700"
        >
          {item.step}
          <span className="absolute inset-0 rounded-full bg-aqua-200 blur-lg" />
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
          <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-aqua-700">
            {item.detail}
          </span>
        </div>
        <p className="mt-4 max-w-[54ch] text-[16.5px] leading-relaxed text-ink-3">{item.body}</p>
      </motion.div>
    </motion.article>
  );
}

const pillars = [
  {
    icon: 'shuffle',
    title: 'Matched by a person',
    body: 'A clinician reads every intake. No questionnaire scoring, no algorithm deciding who understands you.',
  },
  {
    icon: 'lock',
    title: 'Private by construction',
    body: 'End-to-end encrypted sessions, notes visible only to your care team, and no advertising business to sell data to.',
  },
  {
    icon: 'message',
    title: 'Care between sessions',
    body: 'Secure messaging, a plan you can actually see, and a therapist who remembers what you said last week.',
  },
];

export default function Approach() {
  return (
    <Section id="approach" className="py-32 sm:py-44 lg:py-56">
      <SectionHeading
        eyebrow="How it works"
        title="Four steps. No waiting rooms."
        lead="Most people give up on finding a therapist somewhere between the third voicemail and the second waitlist. We removed that part."
      />

      <div className="mt-24 grid gap-16 lg:mt-36 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
        <div>
          {process.map((item, i) => (
            <Step key={item.step} item={item} index={i} total={process.length} />
          ))}
        </div>

        <div className="lg:sticky lg:top-28 lg:h-fit">
          <div className="glass rounded-4xl p-8 shadow-[var(--shadow-lift)] ring-1 ring-aqua-200/30 sm:p-10">
            <p className="font-display text-2xl leading-snug tracking-tight text-ink">
              What makes it hold together
            </p>
            <ul className="mt-8 flex flex-col gap-8">
              {pillars.map((p, i) => (
                <Reveal key={p.title} delay={i * 0.1} as="li">
                  <div className="flex gap-4">
                    <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border border-aqua-300 bg-aqua-100 text-aqua-700">
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
