import { PageHeader } from '../components/primitives';
import Pricing from '../sections/Pricing';
import Faq from '../sections/Faq';
import CtaBand from '../sections/CtaBand';
import { useBooking } from '../lib/booking';
import { useSiteContent } from '../lib/queries/siteContent';

/**
 * Pricing has a page of its own now. On one long homepage the plans sat
 * between the video wall and the FAQ, which is the worst possible place for
 * the question people actually came to answer.
 */
export default function PricingPage() {
  const openBooking = useBooking();
  const content = useSiteContent('pricing');
  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.headline}
        lead={content.lead}
        image={content.image_url}
        imageAlt="A person walking a stone labyrinth above the sea"
      />
      <Pricing onBook={openBooking} withHeading={false} />
      <Faq />
      <CtaBand onBook={openBooking} />
    </>
  );
}
