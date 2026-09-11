import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLatestArticles } from '../lib/queries/articles';
import { listActiveVideos } from '../lib/queries/youtube';
import { listActiveExercises } from '../lib/queries/breathing';
import { breathingDefaults } from '../data/breathingDefaults';
import { Section, SectionHeading, Stagger, StaggerItem } from '../components/primitives';
import { useSiteContent } from '../lib/queries/siteContent';
import Icon from '../components/Icon';

/**
 * Three cards on the homepage, one per thing in the Resources menu: the blog,
 * the videos and the breathing exercises. Each one is a link to that page, and
 * each shows the newest real item underneath its copy, so the card proves the
 * page has something on it rather than just naming it.
 *
 * They "float": the middle and right cards sit lower on a wide screen and each
 * drifts a few pixels on its own loop. The drift lives on a wrapper div, not on
 * the card itself — `.reveal` animates `transform` on entry, and two owners of
 * one property fight. The global prefers-reduced-motion rule stops the loop.
 */

function fill(template, values) {
  return Object.entries(values).reduce(
    (out, [k, v]) => out.replaceAll(`{${k}}`, v ?? ''),
    template ?? '',
  );
}

function FloatCard({ to, kicker, icon, title, body, preview, cta, band, delay, offset }) {
  return (
    <StaggerItem className={`h-full ${offset}`}>
      <div className="float-y h-full" style={{ animationDelay: `${delay}s` }}>
        <Link
          to={to}
          className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-float)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          {band}
          <div className="flex flex-1 flex-col p-6">
            <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink">
              <Icon name={icon} size={12} />
              {kicker}
            </span>
            <h3 className="mt-4 font-display text-[1.3rem] leading-snug tracking-tight text-ink">{title}</h3>
            {body && <p className="mt-2.5 text-[14px] leading-relaxed text-ink-3">{body}</p>}
            {preview && (
              <p className="mt-4 line-clamp-2 rounded-2xl bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
                {preview}
              </p>
            )}
            <span className="mt-auto flex items-center gap-1.5 pt-5 text-[13.5px] font-semibold text-ink">
              {cta}
              <Icon name="arrow" size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      </div>
    </StaggerItem>
  );
}

export default function Explore() {
  const content = useSiteContent('explore');
  const [article, setArticle] = useState(null);
  const [video, setVideo] = useState(null);
  const [exercise, setExercise] = useState(breathingDefaults[0] ?? null);

  useEffect(() => {
    let alive = true;
    // Nothing here is required: each card has its own copy and links to its
    // page whether or not the row loads.
    Promise.allSettled([getLatestArticles(1), listActiveVideos(), listActiveExercises()])
      .then(([a, v, e]) => {
        if (!alive) return;
        if (a.status === 'fulfilled') setArticle(a.value?.[0] ?? null);
        if (v.status === 'fulfilled') {
          const rows = v.value ?? [];
          setVideo([...rows].sort((x, y) => Number(Boolean(y.is_featured)) - Number(Boolean(x.is_featured)))[0] ?? null);
        }
        if (e.status === 'fulfilled' && e.value?.length) setExercise(e.value[0]);
      });
    return () => { alive = false; };
  }, []);

  const thumb = video && (video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`);

  return (
    <Section id="explore" className="py-20 sm:py-24">
      <SectionHeading eyebrow={content.eyebrow} title={content.headline} lead={content.lead} align="center" />

      <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:items-start" step={0.09}>
        <FloatCard
          to="/blog"
          delay={0}
          offset=""
          icon="message"
          kicker={content.blog_kicker}
          title={content.blog_title}
          body={content.blog_body}
          cta={content.blog_cta}
          preview={article ? fill(content.blog_preview, { title: article.title }) : null}
          band={
            <div className="relative flex h-28 items-center justify-center overflow-hidden bg-rose-100">
              <span className="absolute -right-8 -top-10 size-32 rounded-full bg-surface/45" />
              <span className="absolute -bottom-12 -left-6 size-28 rounded-full bg-surface/30" />
              <Icon name="message" size={38} className="relative text-ink/30" />
            </div>
          }
        />

        <FloatCard
          to="/resources#videos"
          delay={1.1}
          offset="lg:mt-10"
          icon="play"
          kicker={content.video_kicker}
          title={content.video_title}
          body={content.video_body}
          cta={content.video_cta}
          preview={video ? fill(content.video_preview, { title: video.title }) : null}
          band={
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
          }
        />

        <FloatCard
          to="/breathe"
          delay={2.2}
          offset="lg:mt-5"
          icon="wave"
          kicker={content.breathe_kicker}
          title={content.breathe_title}
          body={content.breathe_body}
          cta={content.breathe_cta}
          preview={exercise ? fill(content.breathe_preview, { name: exercise.name, n: exercise.cycles }) : null}
          band={
            <div className="relative flex h-28 items-center justify-center overflow-hidden bg-blush-100">
              {/* One ring is static so the card still reads as breathing when
                  motion is reduced, or in a screenshot. */}
              <span className="absolute size-16 rounded-full border border-rose-300" />
              <span className="absolute size-16 rounded-full border border-rose-400 animate-[pulse-ring_3.6s_var(--ease-out-expo)_infinite]" />
              <span className="absolute size-16 rounded-full border border-rose-300 animate-[pulse-ring_3.6s_var(--ease-out-expo)_1.8s_infinite]" />
              <span className="relative size-11 rounded-full bg-rose-200" />
            </div>
          }
        />
      </Stagger>
    </Section>
  );
}
