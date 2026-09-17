import Hero from '../sections/Hero';
import HeardYou from '../sections/HeardYou';
import Services from '../sections/Services';
import Approach from '../sections/Approach';
import Therapists from '../sections/Therapists';
import Testimonials from '../sections/Testimonials';
import Explore from '../sections/Explore';
import BreathePrompt from '../sections/BreathePrompt';
import CommunityBand from '../sections/CommunityBand';
import CtaBand from '../sections/CtaBand';
import { useBooking } from '../lib/booking';
import { useFeatures } from '../lib/features';

/**
 * The homepage is a table of contents, not the whole site. Each block shows a
 * few items and links to the page that holds the rest — every service, the
 * resource library and the FAQ all live on their own pages.
 *
 * The order is deliberate, and it is not the order the money is in. What
 * other people say comes first, immediately under the hero: a stranger
 * deciding whether to trust a practice reads the reviews before they read the
 * prospectus, and burying them eight screens down was asking them to take the
 * site's word for it until then. Then the thing they were afraid to say, then
 * a minute of breathing they can have right now for nothing, and only then
 * what we do and how.
 *
 * The explore cards — articles and short videos — sit where the team used to,
 * because the free, useful thing is what earns the scroll, and because the
 * team is currently switched off (Site content → Show & hide). If it is
 * switched back on it returns here, after the cards rather than in front of
 * them.
 */
export default function HomePage() {
  const openBooking = useBooking();
  const features = useFeatures();
  return (
    <>
      <Hero />
      <CommunityBand />
      {features.proof && <Testimonials limit={3} tinted={false} />}
      <HeardYou limit={3} />
      <BreathePrompt />
      <Services onBook={openBooking} limit={3} teaser />
      <Approach teaser />
      <Explore />
      {features.therapists && <Therapists onBook={openBooking} limit={3} teaser />}
      <CtaBand />
    </>
  );
}
