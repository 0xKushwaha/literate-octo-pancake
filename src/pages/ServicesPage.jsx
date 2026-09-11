import { Button, PageHeader } from '../components/primitives';
import Services from '../sections/Services';
import CtaBand from '../sections/CtaBand';
import { useBooking } from '../lib/booking';
import { useSiteContent } from '../lib/queries/siteContent';

export default function ServicesPage() {
  const openBooking = useBooking();
  const content = useSiteContent('services');
  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.headline}
        lead={content.aside}
        image={content.image_url}
        imageAlt="Two people sitting together, one comforting the other"
      >
        <Button variant="primary" size="lg" icon="arrow" onClick={openBooking}>
          Book a session
        </Button>
      </PageHeader>
      <Services onBook={openBooking} withHeading={false} />
      <CtaBand onBook={openBooking} />
    </>
  );
}
