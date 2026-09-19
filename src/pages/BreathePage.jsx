import { PageHeader } from '../components/primitives';
import Breathing from '../sections/Breathing';
import CtaBand from '../sections/CtaBand';
import { useSiteContent } from '../lib/queries/siteContent';

export default function BreathePage() {
  const content = useSiteContent('breathing');
  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.headline}
        lead={content.lead}
        image={content.image_url}
        imageAlt={content.image_alt}
      />
      <Breathing withHeading={false} tinted={false} />
      <CtaBand />
    </>
  );
}
