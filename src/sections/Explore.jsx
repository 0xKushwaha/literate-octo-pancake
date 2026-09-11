import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHomepageArticles } from '../lib/queries/articles';
import { getHomepageVideos } from '../lib/queries/youtube';
import { listActiveExercises } from '../lib/queries/breathing';
import { breathingDefaults } from '../data/breathingDefaults';
import { MoreLink, Reveal, Section, SectionHeading, Stagger, StaggerItem } from '../components/primitives';
import { useSiteContent } from '../lib/queries/siteContent';
import Icon from '../components/Icon';

/**
 * The homepage's shelf of things to take away: articles, videos and a
 * breathing exercise, each card linking to the page it came from.
 *
 * What appears is the admin's decision, not this file's. Articles come from
 * the "Show on homepage" tick, videos from "Featured", exercises from the
 * active list in sort order, and how many of each from three count fields in
 * Admin → Site content → Home. Every list falls back (newest articles, active
 * videos, the built-in exercises) so an untouched database still fills the
 * shelf instead of emptying it.
 *
 * They float: each card sits at one of three heights on a wide screen and
 * drifts on its own loop. The drift lives on a wrapper div, never on the
 * `.reveal` element — both would be animating `transform`.
 */

const OFFSETS = ['', 'lg:mt-10', 'lg:mt-5'];

/** Counts are CMS text, so they arrive as "3" as often as 3. */
function count(value, fallback, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, max);
}

function fill(template, values) {
  return Object.entries(values).reduce(
    (out, [k, v]) => out.replaceAll(`{${k}}`, v ?? ''),
    template ?? '',
  );
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

function BlogBand() {
  return (
    <div className="relative flex h-28 items-center justify-center overflow-hidden bg-rose-100">
      <span className="absolute -right-8 -top-10 size-32 rounded-full bg-surface/45" />
      <span className="absolute -bottom-12 -left-6 size-28 rounded-full bg-surface/30" />
      <Icon name="message" size={38} className="relative text-ink/30" />
    </div>
  );
}

function VideoBand({ thumb }) {
  return (
    <div className="relative flex h-28 items-center justify-center overflow-hidden bg-peach-100">
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

function BreatheBand() {
  return (
    <div className="relative flex h-28 items-center justify-center overflow-hidden bg-blush-100">
      {/* One ring is static, so the card still reads as breathing when motion
          is reduced — or in a screenshot. */}
      <span className="absolute size-16 rounded-full border border-rose-300" />
      <span className="absolute size-16 rounded-full border border-rose-400 animate-[pulse-ring_3.6s_var(--ease-out-expo)_infinite]" />
      <span className="absolute size-16 rounded-full border border-rose-300 animate-[pulse-ring_3.6s_var(--ease-out-expo)_1.8s_infinite]" />
      <span className="relative size-11 rounded-full bg-rose-200" />
    </div>
  );
}

/* -------------------------------------------------------------------- card */

function FloatCard({ card, index }) {
  return (
    <StaggerItem className={`h-full ${OFFSETS[index % OFFSETS.length]}`}>
      <div className="float-y h-full" style={{ animationDelay: `${(index * 1.1) % 3.3}s` }}>
        <Link
          to={card.to}
          className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-float)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          {card.band}
          <div className="flex flex-1 flex-col p-6">
            <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink">
              <Icon name={card.icon} size={12} />
              {card.kicker}
            </span>
            <h3 className="mt-4 line-clamp-2 font-display text-[1.22rem] leading-snug tracking-tight text-ink">
              {card.title}
            </h3>
            {card.body && <p className="mt-2.5 line-clamp-3 text-[13.5px] leading-relaxed text-ink-3">{card.body}</p>}
            {card.meta && <p className="mt-3 text-[12px] text-ink-4">{card.meta}</p>}
            <span className="mt-auto flex items-center gap-1.5 pt-5 text-[13.5px] font-semibold text-ink">
              {card.cta}
              <Icon name="arrow" size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      </div>
    </StaggerItem>
  );
}

/* ----------------------------------------------------------------- section */

export default function Explore() {
  const c = useSiteContent('explore');
  const blogCount = count(c.blog_count, 3, 6);
  const videoCount = count(c.video_count, 2, 6);
  const breatheCount = count(c.breathe_count, 1, 3);

  const [articles, setArticles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [exercises, setExercises] = useState(breathingDefaults);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      getHomepageArticles(blogCount),
      getHomepageVideos(videoCount),
      listActiveExercises(),
    ]).then(([a, v, e]) => {
      if (!alive) return;
      if (a.status === 'fulfilled') setArticles(a.value ?? []);
      else console.error('[lumen] could not load homepage articles', a.reason);
      if (v.status === 'fulfilled') setVideos(v.value ?? []);
      else console.error('[lumen] could not load homepage videos', v.reason);
      if (e.status === 'fulfilled' && e.value?.length) setExercises(e.value);
    });
    return () => { alive = false; };
  }, [blogCount, videoCount]);

  const cards = [];

  const shownArticles = articles.slice(0, blogCount);
  for (const a of shownArticles) {
    cards.push({
      key: `a-${a.id}`,
      to: `/blog/${a.slug}`,
      icon: 'message',
      kicker: c.blog_kicker,
      title: a.title,
      body: a.excerpt,
      meta: [a.category, formatDate(a.published_at)].filter(Boolean).join(' · '),
      cta: c.blog_cta,
      band: <BlogBand />,
    });
  }
  // Nothing published yet: one card that still points at the blog, rather than
  // a gap where two thirds of the section used to be.
  if (blogCount > 0 && shownArticles.length === 0) {
    cards.push({
      key: 'a-empty', to: '/blog', icon: 'message', kicker: c.blog_kicker,
      title: c.blog_title, body: c.blog_body, cta: c.blog_cta, band: <BlogBand />,
    });
  }

  const shownVideos = videos.slice(0, videoCount);
  for (const v of shownVideos) {
    cards.push({
      key: `v-${v.id}`,
      to: '/resources#videos',
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
      key: 'v-empty', to: '/resources#videos', icon: 'play', kicker: c.video_kicker,
      title: c.video_title, body: c.video_body, cta: c.video_cta, band: <VideoBand /> ,
    });
  }

  for (const e of exercises.slice(0, breatheCount)) {
    cards.push({
      key: `e-${e.id}`,
      to: '/breathe',
      icon: 'wave',
      kicker: c.breathe_kicker,
      title: e.name,
      body: e.description,
      meta: fill(c.breathe_meta, { n: e.cycles }),
      cta: c.breathe_cta,
      band: <BreatheBand />,
    });
  }

  // Every count set to zero is a deliberate "hide this section".
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
