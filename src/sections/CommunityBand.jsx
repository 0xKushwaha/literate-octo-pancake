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
export default function CommunityBand() {
  const content = useSiteContent('community');
  const features = useFeatures();
  const community = useCommunity();

  // No invite saved means no form: a field that collects an address and then
  // has nowhere to send anyone is worse than no field.
  if (!features.community || !community.enabled) return null;

  return (
    <div className="border-b border-line bg-surface">
      <Section className="py-14 sm:py-16">
        <Reveal className="mx-auto max-w-xl text-center">
          {content.eyebrow && (
            <div className="flex justify-center">
              <Eyebrow>{content.eyebrow}</Eyebrow>
            </div>
          )}
          <h2 className="mt-4 font-display text-[clamp(1.6rem,3vw,2.3rem)] leading-[1.12] tracking-[-0.02em] text-ink">
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
