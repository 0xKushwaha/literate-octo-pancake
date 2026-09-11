import { Counter, Reveal, Section } from '../components/primitives';
import { credentials, stats } from '../data/site';

export default function Trust() {
  return (
    <div className="relative border-y border-line py-20 sm:py-28">
      {/* credential ticker */}
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
        <div className="flex w-max animate-marquee gap-14 pr-14">
          {[...credentials, ...credentials, ...credentials].map((c, i) => (
            <span
              key={`${c}-${i}`}
              className="flex shrink-0 items-center gap-4 font-mono text-[11px] uppercase tracking-[0.24em] text-ink-4"
            >
              <span className="size-1 rounded-full bg-rose-400" />
              {c}
            </span>
          ))}
        </div>
      </div>

      <Section className="mt-16">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.09}>
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute -left-4 top-0 hidden h-16 w-px bg-gradient-to-b from-rose-300/60 via-rose-400/30 to-transparent lg:block"
                />
                <dd className="font-display text-[clamp(2.75rem,5vw,4.25rem)] leading-none tracking-tight text-ink">
                  <Counter value={s.value} decimals={s.decimals ?? 0} suffix={s.suffix} />
                </dd>
                <dt className="mt-3 max-w-[22ch] text-[13.5px] leading-snug text-ink-3">
                  {s.label}
                </dt>
              </div>
            </Reveal>
          ))}
        </dl>
      </Section>
    </div>
  );
}
