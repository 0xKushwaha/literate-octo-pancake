import { Fragment } from 'react';
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
import { useSiteContent } from '../lib/queries/siteContent';
import { homeSectionOrder } from '../lib/homeSections';

/**
 * The homepage is a table of contents, not the whole site. Each block shows a
 * few items and links to the page that holds the rest — every service, the
 * resource library and the FAQ all live on their own pages.
 *
 * The order of the middle of the page is the admin's (Show & hide → Homepage
 * sections); HOME_SECTIONS in contentSchema.js is the default. It opens with
 * the free, useful things — the explore cards, then a minute of breathing —
 * because they ask the visitor for nothing, then the reasons people put this
 * off, the reviews, and only then what we do and how.
 *
 * The hero is always first and the closing band always last. Reviews and the
 * team also still answer to their own switches, so switching one off in
 * "What the site shows" hides it here whatever this list says.
 */
export default function HomePage() {
  const openBooking = useBooking();
  const features = useFeatures();
  const { sections } = useSiteContent('homepage');

  const render = {
    explore: () => <Explore />,
    breathe: () => <BreathePrompt />,
    heard: () => <HeardYou limit={3} />,
    testimonials: () => features.testimonials && <Testimonials limit={3} tinted={false} />,
    services: () => <Services onBook={openBooking} limit={3} teaser />,
    approach: () => <Approach teaser />,
    therapists: () => features.therapists && <Therapists onBook={openBooking} limit={3} teaser />,
  };

  return (
    <>
      <Hero />
      {homeSectionOrder(sections).map((id) => (
        <Fragment key={id}>{render[id]?.()}</Fragment>
      ))}
      <CtaBand />
    </>
  );
}
