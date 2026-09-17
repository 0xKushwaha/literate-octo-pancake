import { Section, SectionHeading, sectionPad } from '../components/primitives';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Icon from '../components/Icon';
import { telHref, useBrand, useSiteContent } from '../lib/queries/siteContent';
import { useFaqs } from '../lib/queries/faqs';

/**
 * Radix Accordion rather than a hand-rolled disclosure list: it gives roving
 * focus with Up/Down/Home/End across the triggers, and wires
 * aria-expanded / aria-controls / role=region for us.
 */
export default function Faq({ withHeading = true }) {
  const content = useSiteContent('faq');
  const brand = useBrand();
  const faqs = useFaqs(Array.isArray(content.fallback_items) ? content.fallback_items : []);
  return (
    <Section id="faq" className={sectionPad(withHeading)}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:h-fit">
          {withHeading && <SectionHeading eyebrow={content.eyebrow} title={content.headline} />}
          <div className="mt-8 rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
            <p className="text-[14.5px] leading-relaxed text-ink-3">
              {content.aside}
            </p>
            {brand.phone && (
              <a
                href={telHref(brand.phone)}
                className="mt-4 inline-flex items-center gap-2 text-[15px] text-ink transition-colors hover:text-ink"
              >
                <Icon name="phone" size={15} />
                {brand.phone}
              </a>
            )}
          </div>
        </div>

        <Accordion
          type="single"
          collapsible
          defaultValue="faq-0"
          className="border-t border-line"
        >
          {faqs.map((f, i) => (
            <AccordionItem key={`${f.q}-${i}`} value={`faq-${i}`} className="border-b border-line">
              <AccordionTrigger className="py-6">
                <span className="min-w-0 font-display text-[clamp(1.1rem,1.9vw,1.4rem)] leading-snug tracking-tight text-ink-2 transition-colors duration-300 group-hover:text-ink group-data-[state=open]:text-ink">
                  {f.q}
                </span>
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-ink-3 transition-all duration-500 group-hover:border-line-2 group-hover:text-ink group-data-[state=open]:rotate-45 group-data-[state=open]:border-brand-300 group-data-[state=open]:bg-brand-100 group-data-[state=open]:text-ink"
                >
                  <Icon name="plus" size={16} />
                </span>
              </AccordionTrigger>
              <AccordionContent className="max-w-[68ch] pb-8 pr-14 text-[15.5px] leading-relaxed text-ink-3">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}
