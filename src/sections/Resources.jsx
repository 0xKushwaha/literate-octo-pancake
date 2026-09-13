import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLatestArticles, getArticleBySlug } from '../lib/queries/articles';
import { listActiveVideos } from '../lib/queries/youtube';
import { MoreLink, Section, SectionHeading, Stagger, StaggerItem, sectionPad } from '../components/primitives';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { useSiteContent } from '../lib/queries/siteContent';
import Icon from '../components/Icon';

function formatDuration(sec) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso, style = 'short') {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: style === 'long' ? 'long' : 'short', day: 'numeric', year: 'numeric' });
}

/* ---------------------------------------------------------------- videos */

function VideoCard({ video, onPlay }) {
  // hqdefault always exists; maxresdefault is missing for many uploads and
  // returns a grey placeholder, which looked like a broken card.
  const thumb = video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`;
  return (
    <StaggerItem className="h-full">
      <button
        onClick={() => onPlay(video)}
        className="group flex h-full w-full flex-col overflow-hidden rounded-3xl border border-line bg-surface text-left shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
          <img
            src={thumb}
            alt=""
            loading="lazy"
            decoding="async"
            width={480}
            height={270}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="grid size-12 place-items-center rounded-full bg-surface/95 text-ink shadow-lg transition-transform duration-300 group-hover:scale-110">
              <Icon name="play" size={18} filled />
            </span>
          </div>
          {video.duration_sec && (
            <span className="absolute bottom-2 right-2 rounded-md bg-ink/80 px-1.5 py-0.5 font-mono text-[11px] text-white">
              {formatDuration(video.duration_sec)}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          {video.category && (
            <span className="inline-flex items-center self-start rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-medium text-ink">
              {video.category}
            </span>
          )}
          <h4 className="line-clamp-2 font-display text-[1.05rem] leading-snug tracking-tight text-ink">{video.title}</h4>
          {video.curator_note && (
            <p className="line-clamp-2 text-[12.5px] italic leading-relaxed text-ink-4">{video.curator_note}</p>
          )}
        </div>
      </button>
    </StaggerItem>
  );
}

/* ---------------------------------------------------------------- articles */

function ArticleCard({ article, onClick, labels }) {
  return (
    <StaggerItem className="h-full">
      <button
        onClick={() => onClick(article)}
        className="group flex h-full w-full flex-col overflow-hidden rounded-3xl border border-line bg-surface text-left shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {article.cover_image && (
          <span className="block aspect-[16/9] w-full overflow-hidden bg-peach-50">
            <img
              src={article.cover_image}
              alt={article.cover_alt || ''}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </span>
        )}
        <span className="flex flex-1 flex-col p-6">
        <span className="flex items-center gap-2.5">
          <span className="inline-flex items-center rounded-full bg-sand-100 px-2.5 py-0.5 text-[11px] font-medium text-ink">
            {article.category || labels.default_category}
          </span>
          {article.published_at && <span className="text-[12px] text-ink-4">{formatDate(article.published_at)}</span>}
        </span>
        <span className="mt-4 block font-display text-[clamp(1.1rem,1.8vw,1.35rem)] leading-snug tracking-tight text-ink">
          {article.title}
        </span>
        {article.excerpt && <span className="mt-3 line-clamp-3 block text-[13.5px] leading-relaxed text-ink-3">{article.excerpt}</span>}
        <span className="mt-auto flex items-center gap-1.5 pt-5 text-[13px] font-medium text-ink">
          {labels.read_cta}
          <Icon name="arrow" size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
        </span>
      </button>
    </StaggerItem>
  );
}

function ArticleReader({ article, onClose, labels }) {
  return (
    <div>
      <div className="border-b border-line px-8 pb-6 pt-8 sm:px-12">
        <div className="flex items-center gap-3">
          {article.category && (
            <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink">
              {article.category}
            </span>
          )}
          {article.published_at && <span className="text-[13px] text-ink-4">{formatDate(article.published_at, 'long')}</span>}
        </div>
        <h2 className="mt-4 font-display text-[clamp(1.5rem,3vw,2.2rem)] leading-tight tracking-tight text-ink">{article.title}</h2>
        {article.excerpt && <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-ink-3">{article.excerpt}</p>}
      </div>
      {article.cover_image && (
        <img
          src={article.cover_image}
          alt={article.cover_alt || ''}
          className="block max-h-[340px] w-full object-cover"
        />
      )}
      <div className="prose-lumen px-8 py-8 sm:px-12" dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }} />
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-8 py-6 sm:px-12">
        <button
          onClick={onClose}
          className="rounded-full border border-line px-5 py-2 text-[13px] text-ink-3 transition hover:border-line-2 hover:text-ink"
        >
          {labels.close}
        </button>
        <Link to={`/blog/${article.slug}`} className="text-[13px] text-ink underline underline-offset-4">
          {labels.open_page}
        </Link>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- section */

/**
 * Featured videos and the latest articles. Used as a teaser nowhere and as the
 * body of /resources, which is where the nav's Resources menu points.
 */
export default function Resources({ withHeading = true, videoLimit = 12, articleLimit = 3, teaser = false, showEmpty = false }) {
  const content = useSiteContent('resources');
  const blogContent = useSiteContent('blog');
  const ui = useSiteContent('ui');
  const labels = {
    read_cta: content.read_cta,
    open_page: content.open_page,
    default_category: content.default_category,
    close: ui.close,
  };
  const [videos, setVideos] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);
  const [activeArticle, setActiveArticle] = useState(null);
  const [loadingArticle, setLoadingArticle] = useState(false);

  useEffect(() => {
    let alive = true;
    // Every active video, not only the featured ones. "Featured" now decides
    // the order here rather than whether a video is visible at all: a video
    // added in the admin and never ticked as featured used to save fine and
    // then appear nowhere, which reads as the admin being broken.
    Promise.allSettled([listActiveVideos(), getLatestArticles(articleLimit)])
      .then(([v, a]) => {
        if (!alive) return;
        if (v.status === 'fulfilled') {
          const rows = v.value ?? [];
          const ordered = [...rows].sort((x, y) => Number(Boolean(y.is_featured)) - Number(Boolean(x.is_featured)));
          setVideos(ordered.slice(0, videoLimit));
        } else console.error('[lumen] could not load video resources', v.reason);
        if (a.status === 'fulfilled') setArticles(a.value ?? []);
        else console.error('[lumen] could not load articles', a.reason);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [videoLimit, articleLimit]);

  const openArticle = async (article) => {
    if (article.content) { setActiveArticle(article); return; }
    setLoadingArticle(true);
    setActiveArticle({ ...article, content: '' });
    try {
      const full = await getArticleBySlug(article.slug);
      if (full) setActiveArticle(full);
    } catch {
      // Show what we have.
    } finally {
      setLoadingArticle(false);
    }
  };

  const hasVideos = videos.length > 0;
  const hasArticles = articles.length > 0;
  // The homepage hides itself when there is nothing; the Resources page says
  // so instead, because an empty page with no explanation looks broken.
  if (!loading && !hasVideos && !hasArticles && !showEmpty) return null;

  return (
    <>
      <Section id="resources" className={sectionPad(withHeading)}>
        {withHeading && <SectionHeading eyebrow={content.eyebrow} title={content.headline} lead={content.lead} />}

        {loading ? (
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-3xl bg-surface-2" />
            ))}
          </div>
        ) : (
          <>
            {(hasVideos || showEmpty) && (
              <div id="videos" className={`scroll-mt-28 ${withHeading ? 'mt-12' : ''}`}>
                <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                  <Icon name="play" size={13} />
                  {content.videos_title}
                </h3>
                {hasVideos ? (
                  <Stagger className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {videos.map((v) => (
                      <VideoCard key={v.id} video={v} onPlay={setPlaying} />
                    ))}
                  </Stagger>
                ) : (
                  <p className="mt-4 text-[15px] text-ink-3">{content.videos_empty}</p>
                )}
              </div>
            )}

            {(hasArticles || showEmpty) && (
              <div id="articles" className="mt-14 scroll-mt-28">
                <div className="flex items-end justify-between gap-4">
                  <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                    <Icon name="message" size={13} />
                    {content.articles_title}
                  </h3>
                  <Link to="/blog" className="inline-flex items-center gap-1.5 text-[13.5px] text-ink underline-offset-4 hover:underline">
                    {blogContent.view_all}
                    <Icon name="arrow" size={13} />
                  </Link>
                </div>
                {hasArticles ? (
                  <Stagger className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.map((a) => (
                      <ArticleCard key={a.id} article={a} onClick={openArticle} labels={labels} />
                    ))}
                  </Stagger>
                ) : (
                  <p className="mt-4 text-[15px] text-ink-3">{content.articles_empty}</p>
                )}
              </div>
            )}
          </>
        )}

        {teaser && (hasVideos || hasArticles) && (
          <div className="mt-10 flex justify-center">
            <MoreLink to="/resources">{content.headline}</MoreLink>
          </div>
        )}
      </Section>

      {/* YouTube embed — iframe only exists while open, so nothing preloads. */}
      <Dialog open={!!playing} onOpenChange={(open) => { if (!open) setPlaying(null); }}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-hidden rounded-3xl border-line bg-ink p-0">
          <DialogTitle className="sr-only">{playing?.title ?? 'Video'}</DialogTitle>
          <DialogDescription className="sr-only">YouTube video player</DialogDescription>
          {playing && (
            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${playing.youtube_id}?autoplay=1&rel=0`}
                title={playing.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!activeArticle} onOpenChange={(open) => { if (!open) setActiveArticle(null); }}>
        <DialogContent className="max-h-[85dvh] max-w-3xl overflow-y-auto rounded-3xl border-line bg-surface p-0">
          <DialogTitle className="sr-only">{activeArticle?.title ?? 'Article'}</DialogTitle>
          <DialogDescription className="sr-only">Full article view</DialogDescription>
          {activeArticle && (
            loadingArticle && !activeArticle.content ? (
              <div className="flex h-64 items-center justify-center">
                <div className="size-6 animate-spin rounded-full border-2 border-line-2 border-t-ink" />
              </div>
            ) : (
              <ArticleReader article={activeArticle} onClose={() => setActiveArticle(null)} labels={labels} />
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
