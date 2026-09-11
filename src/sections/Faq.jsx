import { Section, SectionHeading } from '../components/primitives';
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
export default function Faq() {
  const content = useSiteContent('faq');
  const brand = useBrand();
  const faqs = useFaqs(Array.isArray(content.fallback_items) ? content.fallback_items : []);
  return (
    <Section id="faq" className="py-24 sm:py-32">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <SectionHeading eyebrow={content.eyebrow} title={content.headline} />
          <div className="mt-10 rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
            <p className="text-[14.5px] leading-relaxed text-ink-3">
              {content.aside}
            </p>
            <a
              href={telHref(brand.phone)}
              className="mt-4 inline-flex items-center gap-2 text-[15px] text-ink transition-colors hover:text-ink"
            >
              <Icon name="phone" size={15} />
              {brand.phone}
            </a>
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
              <AccordionTrigger className="py-7">
                <span className="font-display text-[clamp(1.15rem,2.2vw,1.6rem)] leading-snug tracking-tight text-ink-2 transition-colors duration-300 group-hover:text-ink group-data-[state=open]:text-ink">
                  {f.q}
                </span>
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-ink-3 transition-all duration-500 group-hover:border-line-2 group-hover:text-ink group-data-[state=open]:rotate-45 group-data-[state=open]:border-rose-300 group-data-[state=open]:bg-rose-100 group-data-[state=open]:text-ink"
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
