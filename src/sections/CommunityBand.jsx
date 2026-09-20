import { Eyebrow, Reveal, Section } from '../components/primitives';
import CommunityJoin from './CommunityJoin';
import { useCommunity, useFeatures } from '../lib/features';
import { useSiteContent } from '../lib/queries/siteContent';

/**
 * The community invite, immediately under the hero.
 *
 * It started life at the foot of the page and was moved here on purpose: an
 * email capture at the bottom is read by the people who already scrolled the
 * whole site, which is the audience least in need of persuading. Directly
 * below the first screen it is the first thing offered after the headline, and
 * it costs a visitor one field.
 *
 * White, not the deep panel. The hero above it is already a tinted band and
 * the closing call to action is already the one dark block on the page —
 * a third heavy band between them would flatten both.
 */
// Not on the homepage any more: the email capture was removed from it and the
// explore cards took its place. Kept because the community is still offered in
// the header and the closing band, and putting the capture back is one line in
// HomePage.jsx.
export default function CommunityBand() {
  const content = useSiteContent('community');
  const features = useFeatures();
  const community = useCommunity();

  // Only the Show & hide switch decides whether this appears. It used to also
  // require a saved invite link, which meant the band was invisible on the
  // live site until someone pasted a Discord URL — a section that silently is
  // not there is indistinguishable from a deploy that did not happen, and it
  // read as exactly that twice. With no invite saved the form still collects
  // the address and says the invite is coming, which is worth more than the
  // click it cannot yet offer.
  if (!features.community) return null;

  return (
    <div className="border-b border-line bg-surface">
      <Section id="community" className="py-14 sm:py-16">
        <Reveal className="mx-auto max-w-xl text-center">
          {content.eyebrow && (
            <div className="flex justify-center">
              <Eyebrow>{content.eyebrow}</Eyebrow>
            </div>
          )}
          <h2 className="t-section-title mt-4 font-display text-[clamp(1.6rem,3vw,2.3rem)] leading-[1.12] tracking-[-0.02em] text-ink">
            {content.headline} <span className="italic text-accent-strong">{content.headline_accent}</span>
          </h2>
          <div className="mt-7">
            <CommunityJoin inviteUrl={community.url} content={content} tone="light" />
          </div>
        </Reveal>
      </Section>
    </div>
  );
}
