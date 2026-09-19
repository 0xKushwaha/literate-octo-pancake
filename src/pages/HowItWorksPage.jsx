import { Button, PageHeader } from '../components/primitives';
import Approach, { Why } from '../sections/Approach';
import HeardYou from '../sections/HeardYou';
import Faq from '../sections/Faq';
import CtaBand from '../sections/CtaBand';
import { usePrimaryCta } from '../lib/features';
import { useSiteContent } from '../lib/queries/siteContent';

/** Everything about the process in one place: steps, why, the FAQ. */
export default function HowItWorksPage() {
  const content = useSiteContent('approach');
  const cta = usePrimaryCta(content.header_cta);
  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.headline}
        lead={content.lead}
        image={content.image_url}
        imageAlt={content.image_alt}
      >
        {cta && (
          <Button variant="primary" size="lg" icon="arrow" {...cta.props}>
            {cta.mode === 'book' ? content.header_cta : cta.label}
          </Button>
        )}
      </PageHeader>
      <Approach withHeading={false} />
      <Why />
      <HeardYou />
      <Faq />
      <CtaBand />
    </>
  );
}
