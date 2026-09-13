import { PageHeader } from '../components/primitives';
import Resources from '../sections/Resources';
import CtaBand from '../sections/CtaBand';
import { useSiteContent } from '../lib/queries/siteContent';

export default function ResourcesPage() {
  const content = useSiteContent('resources');
  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.headline}
        lead={content.lead}
        image={content.image_url}
        imageAlt="A person holding a warm mug at a table"
      />
      <Resources withHeading={false} videoLimit={12} articleLimit={6} showEmpty />
      <CtaBand />
    </>
  );
}
