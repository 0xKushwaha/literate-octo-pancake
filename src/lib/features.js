import { Link } from 'react-router-dom';
import { useBooking } from './booking';
import { isFeatureOn } from './featureFlag';
import { useSiteContent } from './queries/siteContent';
import { safeExternalUrl } from './safeUrl';

/**
 * Whole parts of the site, switched on and off from the admin.
 *
 * The founder asked for booking, the therapist profiles and the pricing page
 * to come off the site. Deleting them would have meant deleting the booking
 * form, six content sections and two routes, and putting any of it back would
 * have meant a developer. So none of it is deleted: each one is a switch under
 * Site content → Show & hide, and every switch ships off. Turning one on
 * restores that part exactly as it was, with its content intact.
 *
 * See featureFlag.js for how a stored switch is read.
 */
export function useFeatures() {
  const f = useSiteContent('features');
  return {
    booking: isFeatureOn(f.booking),
    therapists: isFeatureOn(f.therapists),
    pricing: isFeatureOn(f.pricing),
    community: isFeatureOn(f.community),
    proof: isFeatureOn(f.proof),
    testimonials: isFeatureOn(f.testimonials),
  };
}

/**
 * The Discord community, and whether there is anything to link to yet.
 *
 * `enabled` is false while the invite URL is blank. That is deliberate: the
 * practice will have the button on the site before it has the invite link,
 * and a button that goes nowhere is worse than no button at all.
 */
export function useCommunity() {
  const content = useSiteContent('community');
  const features = useFeatures();
  // Only an https link is ever opened; anything else counts as no link yet.
  const url = safeExternalUrl(content.invite_url) ?? '';
  return { ...content, url, enabled: features.community && url !== '' };
}

/**
 * The single primary action the site offers, wherever a button needs one.
 *
 * Booking when booking is on; the Discord invite when it is not. Returns
 * `null` when there is nothing to offer — booking off and no invite saved —
 * so a caller can leave the space empty rather than render a dead control.
 *
 * The shape is button props, so a call site is one spread:
 *   const cta = usePrimaryCta(content.primary_cta);
 *   {cta && <Button {...cta.props}>{cta.label}</Button>}
 */
export function usePrimaryCta(bookLabel, { communityLabel, prefill } = {}) {
  const openBooking = useBooking();
  const features = useFeatures();
  const community = useCommunity();

  if (features.booking) {
    return {
      mode: 'book',
      label: bookLabel,
      props: { onClick: () => openBooking(prefill ?? undefined) },
    };
  }
  if (community.enabled) {
    return {
      mode: 'community',
      // The header, the mobile bar and the closing band each get their own
      // label field, because "Join our community" is the right length for a
      // band and too long for a phone's sticky bar.
      label: communityLabel || community.cta_label,
      props: { as: 'a', href: community.url, target: '_blank', rel: 'noreferrer noopener' },
    };
  }
  if (features.community) {
    // Switched on, but no invite link saved yet. Rather than vanish — which
    // left the header with no action at all and read as a broken deploy — the
    // button points at the band on the homepage, which takes the email and
    // promises the invite by mail.
    return {
      mode: 'community',
      label: communityLabel || community.cta_label,
      props: { as: Link, to: '/#community' },
    };
  }
  return null;
}
