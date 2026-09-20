import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHomepageArticles } from '../lib/queries/articles';
import { getHomepageVideos } from '../lib/queries/youtube';
import { getHomepageInfographics } from '../lib/queries/infographics';
import { MoreLink, Reveal, Section, SectionHeading, Stagger, StaggerItem } from '../components/primitives';
import { useSiteContent } from '../lib/queries/siteContent';
import Icon from '../components/Icon';

/**
 * The homepage's shelf of things to take away: articles and videos, each card
 * linking to the page it came from. Breathing is deliberately not here — it is
 * an invitation to stop rather than something to read later, so it has its own
 * band (src/sections/BreathePrompt.jsx) further down the page.
 *
 * What appears is the admin's decision, not this file's: articles come from the
 * "Show on homepage" tick in the blog editor, videos from the same tick in
 * Videos, and how many of each from two count fields in Admin → Site content →
 * Home. Both lists fall back (newest articles, first active videos) so an
 * untouched database still fills the shelf instead of emptying it.
 *
 * They float: each card sits at one of three heights on a wide screen and
 * drifts on its own loop. The drift lives on a wrapper div, never on the
 * `.reveal` element — both would be animating `transform`.
 */

const OFFSETS = ['', 'lg:mt-10', 'lg:mt-5'];

/**
 * Where a card's corner arrow goes: the section on /resources that this kind
 * of card was drawn from, never the individual item. Both anchors are real
 * ids in src/sections/Resources.jsx — change them together.
 */
const ARTICLES_SECTION = '/resources#articles';
const VIDEOS_SECTION = '/resources#videos';
const INFOGRAPHICS_SECTION = '/resources#infographics';

/** Counts are CMS text, so they arrive as "3" as often as 3. */
function count(value, fallback, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, max);
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(sec) {
  if (!sec) return null;
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

/* ------------------------------------------------------------------- bands */

function BlogBand({ cover, alt }) {
  return (
    // The article's own cover when it has one, and otherwise a drawn band:
    // peach, not brand blue, because this is the one part of an explore card
    // that is pure decoration — visible on the homepage, load-bearing nowhere.
    <div className="relative flex h-28 items-center justify-center overflow-hidden bg-peach-50">
      {cover ? (
        <img
          src={cover}
          alt={alt || ''}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <>
          <span className="absolute -right-8 -top-10 size-32 rounded-full bg-surface/45" />
          <span className="absolute -bottom-12 -left-6 size-28 rounded-full bg-surface/30" />
          <Icon name="message" size={38} className="relative text-ink/30" />
        </>
      )}
    </div>
  );
}

function InfographicBand({ image, alt }) {
  return (
    <div className="relative flex h-28 items-center justify-center overflow-hidden bg-brand-100">
      {image ? (
        <img
          src={image}
          alt={alt || ''}
          loading="lazy"
          decoding="async"
          // object-top, because an infographic's title is at the top of the
          // picture and a centred crop of a tall image shows its middle.
          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <>
          <span className="absolute -left-8 -top-10 size-32 rounded-full bg-surface/40" />
          <span className="absolute -bottom-12 -right-6 size-28 rounded-full bg-surface/25" />
          <Icon name="image" size={38} className="relative text-ink/30" />
        </>
      )}
    </div>
  );
}

function VideoBand({ thumb }) {
  return (
    <div className="relative flex h-28 items-center justify-center overflow-hidden bg-sand-100">
      {thumb && (
        <img
          src={thumb}
          alt=""
          loading="lazy"
          decoding="async"
          width={480}
          height={270}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <span className="relative grid size-12 place-items-center rounded-full bg-surface/95 text-ink shadow-lg transition-transform duration-300 group-hover:scale-110">
        <Icon name="play" size={18} filled />
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------- card */

/**
 * Two destinations on one card, which is why the card itself is no longer the
 * link.
 *
 * The body opens the thing on the card — this article, this video. The arrow
 * in the corner opens the section it came from, the way the service cards'
 * arrow opens the service. An article card therefore points at two different
 * places, and an `<a>` cannot contain another `<a>`.
 *
 * So the card is a plain element and the title carries the main link with a
 * stretched `::after` covering the whole card, which is what makes the body
 * clickable everywhere. The arrow is a sibling link lifted above that overlay
 * with `relative z-10` — it comes first in the DOM, so without the z-index the
 * overlay would simply swallow it. Focus moves to the card via focus-within,
 * because the element that shows the ring is no longer the element that takes
 * the focus.
 */
function FloatCard({ card, index }) {
  return (
    <StaggerItem className={`h-full ${OFFSETS[index % OFFSETS.length]}`}>
      <div className="float-y h-full" style={{ animationDelay: `${(index * 1.1) % 3.3}s` }}>
        <div className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-float)] focus-within:ring-2 focus-within:ring-brand-500">
          {card.band}
          <div className="flex flex-1 flex-col p-6">
            {/* Kicker on the left, the same circular arrow the service cards
                carry on the right. The badge sits on the kicker row rather
                than over the band because a thumbnail underneath it cannot be
                relied on for contrast. */}
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink">
                <Icon name={card.icon} size={12} />
                {card.kicker}
              </span>
              {card.arrowTo && (
                <Link
                  to={card.arrowTo}
                  aria-label={card.arrowLabel}
                  className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border border-ink/15 text-ink-4 transition-[color,background-color,border-color,transform] duration-300 group-hover:border-brand-500 group-hover:bg-brand-500 group-hover:text-on-brand hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <Icon name="arrowUpRight" size={14} />
                </Link>
              )}
            </div>
            <h3 className="t-card-title mt-4 line-clamp-2 font-display text-[1.22rem] leading-snug tracking-tight text-ink">
              <Link to={card.to} className="after:absolute after:inset-0 focus-visible:outline-none">
                {card.title}
              </Link>
            </h3>
            {card.body && <p className="t-card-text mt-2.5 line-clamp-3 text-[13.5px] leading-relaxed text-ink-3">{card.body}</p>}
            {card.meta && <p className="mt-3 text-[12px] text-ink-4">{card.meta}</p>}
            <span className="mt-auto flex items-center gap-1.5 pt-5 text-[13.5px] font-semibold text-ink">
              {card.cta}
              <Icon name="arrow" size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </StaggerItem>
  );
}

/* ----------------------------------------------------------------- section */

export default function Explore() {
  const c = useSiteContent('explore');
  const blogCount = count(c.blog_count, 1, 6);
  const videoCount = count(c.video_count, 1, 6);
  const infographicCount = count(c.infographic_count, 1, 6);

  const [articles, setArticles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [infographics, setInfographics] = useState([]);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      getHomepageArticles(blogCount),
      getHomepageVideos(videoCount),
      getHomepageInfographics(infographicCount),
    ]).then(([a, v, g]) => {
      if (!alive) return;
      if (a.status === 'fulfilled') setArticles(a.value ?? []);
      else console.error('[lumen] could not load homepage articles', a.reason);
      if (v.status === 'fulfilled') setVideos(v.value ?? []);
      else console.error('[lumen] could not load homepage videos', v.reason);
      if (g.status === 'fulfilled') setInfographics(g.value ?? []);
      else console.error('[lumen] could not load homepage infographics', g.reason);
    });
    return () => { alive = false; };
  }, [blogCount, videoCount, infographicCount]);

  const cards = [];

  const shownArticles = articles.slice(0, blogCount);
  for (const a of shownArticles) {
    cards.push({
      key: `a-${a.id}`,
      to: `/blog/${a.slug}`,
      arrowTo: ARTICLES_SECTION,
      arrowLabel: c.more_link,
      icon: 'message',
      kicker: c.blog_kicker,
      title: a.title,
      body: a.excerpt,
      meta: [a.category, formatDate(a.published_at)].filter(Boolean).join(' · '),
      cta: c.blog_cta,
      band: <BlogBand cover={a.cover_image} alt={a.cover_alt} />,
    });
  }
  // Nothing published yet: one card that still points at the blog, rather than
  // a gap where two thirds of the section used to be.
  if (blogCount > 0 && shownArticles.length === 0) {
    cards.push({
      key: 'a-empty', to: '/blog', arrowTo: ARTICLES_SECTION, arrowLabel: c.more_link, icon: 'message', kicker: c.blog_kicker,
      title: c.blog_title, body: c.blog_body, cta: c.blog_cta, band: <BlogBand />,
    });
  }

  const shownVideos = videos.slice(0, videoCount);
  for (const v of shownVideos) {
    cards.push({
      key: `v-${v.id}`,
      to: '/resources#videos',
      arrowTo: VIDEOS_SECTION,
      arrowLabel: c.more_link,
      icon: 'play',
      kicker: c.video_kicker,
      title: v.title,
      body: v.curator_note,
      meta: [v.category, formatDuration(v.duration_sec)].filter(Boolean).join(' · '),
      cta: c.video_cta,
      band: <VideoBand thumb={v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`} />,
    });
  }
  if (videoCount > 0 && shownVideos.length === 0) {
    cards.push({
      key: 'v-empty', to: '/resources#videos', arrowTo: VIDEOS_SECTION, arrowLabel: c.more_link, icon: 'play', kicker: c.video_kicker,
      title: c.video_title, body: c.video_body, cta: c.video_cta, band: <VideoBand /> ,
    });
  }

  const shownInfographics = infographics.slice(0, infographicCount);
  for (const g of shownInfographics) {
    cards.push({
      key: `g-${g.id}`,
      to: INFOGRAPHICS_SECTION,
      arrowTo: INFOGRAPHICS_SECTION,
      arrowLabel: c.more_link,
      icon: 'image',
      kicker: c.infographic_kicker,
      title: g.title,
      body: g.description,
      meta: g.category || null,
      cta: c.infographic_cta,
      band: <InfographicBand image={g.image_url} alt={g.image_alt} />,
    });
  }
  if (infographicCount > 0 && shownInfographics.length === 0) {
    cards.push({
      key: 'g-empty', to: INFOGRAPHICS_SECTION, arrowTo: INFOGRAPHICS_SECTION, arrowLabel: c.more_link,
      icon: 'image', kicker: c.infographic_kicker,
      title: c.infographic_title, body: c.infographic_body, cta: c.infographic_cta, band: <InfographicBand />,
    });
  }

  // Both counts set to zero is a deliberate "hide this section".
  if (cards.length === 0) return null;

  return (
    <Section id="explore" className="py-20 sm:py-24">
      <SectionHeading eyebrow={c.eyebrow} title={c.headline} lead={c.lead} align="center" />

      <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:items-start" step={0.08}>
        {cards.map((card, i) => <FloatCard key={card.key} card={card} index={i} />)}
      </Stagger>

      {c.more_link && (
        <Reveal delay={0.15} className="mt-14 flex justify-center sm:mt-16">
          <MoreLink to="/resources">{c.more_link}</MoreLink>
        </Reveal>
      )}
    </Section>
  );
}
