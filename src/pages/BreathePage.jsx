import { PageHeader } from '../components/primitives';
import Breathing from '../sections/Breathing';
import CtaBand from '../sections/CtaBand';
import { useBooking } from '../lib/booking';
import { useSiteContent } from '../lib/queries/siteContent';

export default function BreathePage() {
  const openBooking = useBooking();
  const content = useSiteContent('breathing');
  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.headline}
        lead={content.lead}
        image={content.image_url}
        imageAlt="A person with a hand on their chest, eyes closed"
      />
      <Breathing withHeading={false} tinted={false} />
      <CtaBand onBook={openBooking} />
    </>
  );
}
