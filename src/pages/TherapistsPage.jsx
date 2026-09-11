import { Button, PageHeader } from '../components/primitives';
import Therapists from '../sections/Therapists';
import Testimonials from '../sections/Testimonials';
import CtaBand from '../sections/CtaBand';
import { useBooking } from '../lib/booking';
import { useSiteContent } from '../lib/queries/siteContent';

export default function TherapistsPage() {
  const openBooking = useBooking();
  const content = useSiteContent('therapists');
  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.headline}
        lead={content.lead}
        image={content.image_url}
        imageAlt="A quiet therapy room with two armchairs and a plant"
      >
        <Button variant="primary" size="lg" icon="arrow" onClick={openBooking}>
          Ask for a match
        </Button>
      </PageHeader>
      <Therapists onBook={openBooking} withHeading={false} />
      <Testimonials limit={6} />
      <CtaBand onBook={openBooking} />
    </>
  );
}
