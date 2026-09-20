import Hero from '../sections/Hero';
import HeardYou from '../sections/HeardYou';
import Services from '../sections/Services';
import Approach from '../sections/Approach';
import Therapists from '../sections/Therapists';
import Testimonials from '../sections/Testimonials';
import Explore from '../sections/Explore';
import BreathePrompt from '../sections/BreathePrompt';
import CtaBand from '../sections/CtaBand';
import { useBooking } from '../lib/booking';
import { useFeatures } from '../lib/features';

/**
 * The homepage is a table of contents, not the whole site. Each block shows a
 * few items and links to the page that holds the rest — every service, the
 * resource library and the FAQ all live on their own pages.
 *
 * The order is deliberate, and it is not the order the money is in. The
 * reasons people put this off come first: a visitor who has been meaning to
 * do this for two years should meet their own sentence before they meet
 * anyone else's, because recognition is what earns the next scroll and praise
 * from strangers is not. The reviews follow, answering the doubt the quotes
 * just named. Then a minute of breathing they can have right now for nothing,
 * and only then what we do and how.
 *
 * The explore cards — articles and short videos — now sit directly under the
 * hero, where the community email capture used to be. The free, useful thing
 * is what earns the scroll, and it asks the visitor for nothing. The capture
 * itself is gone from this page; the community is offered in the header and
 * in the closing band, which is enough places to ask.
 *
 * The team, when it is switched back on (Site content → Show & hide), returns
 * near the foot of the page rather than in front of the cards.
 */
export default function HomePage() {
  const openBooking = useBooking();
  const features = useFeatures();
  return (
    <>
      <Hero />
      <Explore />
      <BreathePrompt />
      <HeardYou limit={3} />
      {features.testimonials && <Testimonials limit={3} tinted={false} />}
      <Services onBook={openBooking} limit={3} teaser />
      <Approach teaser />
      {features.therapists && <Therapists onBook={openBooking} limit={3} teaser />}
      <CtaBand />
    </>
  );
}
