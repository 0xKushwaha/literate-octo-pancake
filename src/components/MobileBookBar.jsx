import { Button } from './primitives';
import Icon from './Icon';
import { telHref, useBrand, useSiteContent } from '../lib/queries/siteContent';
import { useScrollValue } from '../motion/ScrollStory';
import { useCommunity, usePrimaryCta } from '../lib/features';

/**
 * Up once the hero is behind us, down again near the footer, where the closing
 * band has a call to action of its own and a floating bar would cover it.
 * Same two thresholds this component has always used; they read from the
 * shared scroll driver now rather than from a listener of its own.
 */
const FOOTER_GUTTER = 260;
const barVisible = (m) => m.y > m.vh * 0.9 && m.vh + m.y <= m.docH - FOOTER_GUTTER;

/**
 * On a phone the header's one action is behind a menu, so it gets surfaced
 * permanently once the hero has scrolled past. Whichever action that is:
 * booking, or the community invite. With neither switched on the bar has
 * nothing to carry but the phone number, so it does not appear at all.
 */
export default function MobileBookBar() {
  const brand = useBrand();
  const booking = useSiteContent('booking');
  const community = useCommunity();
  const cta = usePrimaryCta(booking.mobile_bar_label, { communityLabel: community.mobile_label });
  const show = useScrollValue(barVisible);

  if (!cta) return null;

  return (
    <div
      className={`fixed inset-x-3 bottom-3 z-40 transition-[transform,opacity] duration-300 ease-out sm:hidden ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-24 opacity-0'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-hidden={!show}
    >
          <div className="flex items-center gap-3 rounded-full border border-line bg-surface/95 p-2 pl-5 shadow-[var(--shadow-float)] backdrop-blur-md">
            <a
              href={telHref(brand.phone)}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-ink-2"
              aria-label={`Call ${brand.name}`}
            >
              <Icon name="phone" size={17} />
            </a>
            <Button variant="primary" size="md" icon="arrow" className="flex-1" {...cta.props}>
              {cta.label}
            </Button>
          </div>
    </div>
  );
}
