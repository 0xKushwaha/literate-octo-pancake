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

/**
 * The homepage is a table of contents, not the whole site. Each block shows a
 * few items and links to the page that holds the rest — pricing, the full
 * team, every service, the resource library and the FAQ all live on their own
 * pages now. Keeping this page short is the point: the previous single-page
 * version asked for about twelve screens of scrolling before the footer.
 *
 * The order is deliberate, and it is not the order the money is in. A first
 * visit goes: here is what we do, here is the thing you were afraid to say,
 * here is a minute of breathing you can have right now for nothing — and only
 * then the services, the team, and what it costs. Someone weighing up therapy
 * is not ready to be sold to in the first five seconds, and the free, useful
 * thing is what earns the scroll that gets them to the rest. Prices stay one
 * click away, on /services and /pricing, where someone who wants them will
 * look for them.
 */
export default function HomePage() {
  const openBooking = useBooking();
  return (
    <>
      <Hero onBook={openBooking} />
      <HeardYou limit={3} />
      <BreathePrompt />
      <Services onBook={openBooking} limit={3} teaser />
      <Approach teaser />
      <Therapists onBook={openBooking} limit={3} teaser />
      <Testimonials limit={3} />
      <Explore />
      <CtaBand onBook={openBooking} />
    </>
  );
}
