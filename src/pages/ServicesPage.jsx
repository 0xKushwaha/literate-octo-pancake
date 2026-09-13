import { Button, PageHeader } from '../components/primitives';
import Services from '../sections/Services';
import CtaBand from '../sections/CtaBand';
import { useBooking } from '../lib/booking';
import { usePrimaryCta } from '../lib/features';
import { useSiteContent } from '../lib/queries/siteContent';

export default function ServicesPage() {
  const openBooking = useBooking();
  const content = useSiteContent('services');
  const cta = usePrimaryCta(content.header_cta);
  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.headline}
        lead={content.aside}
        image={content.image_url}
        imageAlt="Two people sitting together, one comforting the other"
      >
        {cta && (
          <Button variant="primary" size="lg" icon="arrow" {...cta.props}>
            {cta.mode === 'book' ? content.header_cta : cta.label}
          </Button>
        )}
      </PageHeader>
      <Services onBook={openBooking} withHeading={false} />
      <CtaBand />
    </>
  );
}
