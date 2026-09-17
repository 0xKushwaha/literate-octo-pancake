import { useEffect } from 'react';
import { Section } from '../components/primitives';
import { useBrand, useSiteContent } from '../lib/queries/siteContent';
import { fillPlaceholders, parseLegalText } from '../lib/legalText';

/**
 * /privacy and /terms. The words live in Admin → Site content → Legal pages,
 * as plain text (see lib/legalText.js for the few formatting rules), so the
 * practice can have a lawyer revise them without a developer.
 */
export default function LegalPage({ kind }) {
  const legal = useSiteContent('legal');
  const brand = useBrand();
  const title = legal[`${kind}_title`];
  const values = { name: brand.name, email: brand.email, updated: legal[`${kind}_updated`] };
  const blocks = parseLegalText(fillPlaceholders(legal[`${kind}_body`], values));

  useEffect(() => {
    const before = document.title;
    if (title) document.title = `${title} · ${brand.name}`;
    return () => {
      document.title = before;
    };
  }, [title, brand.name]);

  return (
    <div className="backdrop-soft">
      <Section className="py-14 sm:py-20">
        <article className="mx-auto max-w-[70ch] rounded-3xl border border-line bg-surface px-6 py-10 sm:px-12 sm:py-14">
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-tight tracking-tight text-ink">{title}</h1>
          {values.updated && (
            <p className="mt-3 text-[13px] text-ink-4">
              {legal.updated_prefix} {values.updated}
            </p>
          )}
          <div className="prose-lumen mt-8">
            {blocks.map((b, i) => {
              if (b.type === 'h2') return <h2 key={i} id={b.id} className="scroll-mt-28">{b.text}</h2>;
              if (b.type === 'ul') {
                return (
                  <ul key={i}>
                    {b.items.map((item, j) => <li key={j}>{item}</li>)}
                  </ul>
                );
              }
              return <p key={i}>{b.text}</p>;
            })}
          </div>
        </article>
      </Section>
    </div>
  );
}
