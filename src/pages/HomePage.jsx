import Hero from '../sections/Hero';
import HeardYou from '../sections/HeardYou';
import Services from '../sections/Services';
import Approach from '../sections/Approach';
import Therapists from '../sections/Therapists';
import Testimonials from '../sections/Testimonials';
import CtaBand from '../sections/CtaBand';
import { useBooking } from '../lib/booking';

/**
 * The homepage is a table of contents, not the whole site. Each block shows a
 * few items and links to the page that holds the rest — pricing, the full
 * team, every service, the resource library and the FAQ all live on their own
 * pages now. Keeping this page short is the point: the previous single-page
 * version asked for about twelve screens of scrolling before the footer.
 */
export default function HomePage() {
  const openBooking = useBooking();
  return (
    <>
      <Hero onBook={openBooking} />
      <HeardYou limit={3} />
      <Services onBook={openBooking} limit={3} teaser />
      <Approach teaser />
      <Therapists onBook={openBooking} limit={3} teaser />
      <Testimonials limit={3} />
      <CtaBand onBook={openBooking} />
    </>
  );
}
