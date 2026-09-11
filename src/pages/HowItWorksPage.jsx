import { Button, PageHeader } from '../components/primitives';
import Approach, { Why } from '../sections/Approach';
import HeardYou from '../sections/HeardYou';
import Faq from '../sections/Faq';
import CtaBand from '../sections/CtaBand';
import { useBooking } from '../lib/booking';
import { useSiteContent } from '../lib/queries/siteContent';

/** Everything about the process in one place: steps, why, the FAQ. */
export default function HowItWorksPage() {
  const openBooking = useBooking();
  const content = useSiteContent('approach');
  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.headline}
        lead={content.lead}
        image={content.image_url}
        imageAlt="A person smiling during a video call at home"
      >
        <Button variant="primary" size="lg" icon="arrow" onClick={openBooking}>
          {content.header_cta}
        </Button>
      </PageHeader>
      <Approach withHeading={false} />
      <Why />
      <HeardYou />
      <Faq />
      <CtaBand onBook={openBooking} />
    </>
  );
}
