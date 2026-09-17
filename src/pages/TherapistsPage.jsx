import { Button, PageHeader } from '../components/primitives';
import Therapists from '../sections/Therapists';
import Testimonials from '../sections/Testimonials';
import CtaBand from '../sections/CtaBand';
import { useBooking } from '../lib/booking';
import { useFeatures, usePrimaryCta } from '../lib/features';
import { useSiteContent } from '../lib/queries/siteContent';

export default function TherapistsPage() {
  const openBooking = useBooking();
  const content = useSiteContent('therapists');
  const cta = usePrimaryCta(content.header_cta);
  const features = useFeatures();
  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.headline}
        lead={content.lead}
        image={content.image_url}
        imageAlt="A quiet therapy room with two armchairs and a plant"
      >
        {cta && (
          <Button variant="primary" size="lg" icon="arrow" {...cta.props}>
            {cta.mode === 'book' ? content.header_cta : cta.label}
          </Button>
        )}
      </PageHeader>
      <Therapists onBook={openBooking} withHeading={false} />
      {features.testimonials && <Testimonials limit={6} />}
      <CtaBand />
    </>
  );
}
