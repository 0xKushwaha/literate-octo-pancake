import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getLatestArticles, getArticleBySlug } from '../lib/queries/articles';
import { Section, SectionHeading, Stagger, staggerItem } from '../components/primitives';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { useSiteContent } from '../lib/queries/siteContent';
import { notifySectionsChanged } from '../lib/sections';

const ACCENT_MAP = {
  rose: { pill: 'bg-rose-100 text-ink', hover: 'group-hover:text-ink', bar: 'bg-rose-300' },
  blush: { pill: 'bg-blush-100 text-ink', hover: 'group-hover:text-ink', bar: 'bg-rose-300' },
  peach: { pill: 'bg-blush-100 text-ink', hover: 'group-hover:text-ink', bar: 'bg-rose-300' },
};
const ACCENTS = ['rose', 'blush', 'peach'];

function ArticleCard({ article, index, onClick }) {
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  const accent = ACCENT_MAP[ACCENTS[index % ACCENTS.length]];

  return (
    <motion.div variants={staggerItem}>
      <button
        onClick={() => onClick(article)}
        className="group relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-line bg-surface text-left shadow-[var(--shadow-card)] transition-all duration-500 hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
      >
        {/* Top accent bar */}
        <div className={`h-1 w-full ${accent.bar} opacity-60 transition-opacity group-hover:opacity-100`} />

        <div className="flex flex-1 flex-col p-7">
          <div className="flex items-center gap-2.5">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${accent.pill}`}>
              {article.category || 'Mental Health'}
            </span>
            {date && <span className="text-[12px] text-ink-4">{date}</span>}
          </div>

          <h3 className={`mt-4 font-display text-[clamp(1.1rem,1.8vw,1.35rem)] leading-snug tracking-tight text-ink transition-colors ${accent.hover}`}>
            {article.title}
          </h3>

          {article.excerpt && (
            <p className="mt-3 line-clamp-3 text-[13.5px] leading-relaxed text-ink-3">
              {article.excerpt}
            </p>
          )}

          <div className="mt-auto pt-5 flex items-center gap-1.5 text-[13px] font-medium text-ink">
            Read article
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

function ArticleReader({ article, onClose }) {
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  return (
    <div className="relative">
      {/* Header */}
      <div className="border-b border-gray-100 px-8 pb-6 pt-8 sm:px-12">
        <div className="flex items-center gap-3">
          {article.category && (
            <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink">
              {article.category}
            </span>
          )}
          {date && <span className="text-[13px] text-ink-4">{date}</span>}
        </div>
        <h2 className="mt-4 font-display text-[clamp(1.5rem,3vw,2.2rem)] leading-tight tracking-tight text-ink">
          {article.title}
        </h2>
        {article.excerpt && (
          <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-ink-3">
            {article.excerpt}
          </p>
        )}
      </div>

      {/* Content */}
      <div
        className="prose-lumen px-8 py-8 sm:px-12"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
      />

      {/* Footer */}
      <div className="border-t border-gray-100 px-8 py-6 sm:px-12">
        <button
          onClick={onClose}
          className="rounded-full border border-line px-5 py-2 text-[13px] text-ink-3 transition hover:border-line-2 hover:text-ink"
        >
          Close article
        </button>
      </div>
    </div>
  );
}

export default function Blog() {
  const content = useSiteContent('blog');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeArticle, setActiveArticle] = useState(null);
  const [loadingArticle, setLoadingArticle] = useState(false);

  useEffect(() => {
    let alive = true;
    getLatestArticles(6)
      .then((rows) => { if (alive) setArticles(rows ?? []); })
      .catch((err) => {
        // Was `.catch(() => {})`. The section then hid itself, so a missing
        // table and an empty one were indistinguishable — and neither left a
        // trace anywhere to diagnose from.
        if (alive) {
          console.error(
            '[lumen] could not load articles. If this is a fresh deploy, check that the ' +
              'migrations have run and that `articles` has at least one published row.',
            err,
          );
        }
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
        queueMicrotask(notifySectionsChanged);
      });
    return () => { alive = false; };
  }, []);

  const openArticle = async (article) => {
    // If we already have the content (from demo data), use it directly
    if (article.content) {
      setActiveArticle(article);
      return;
    }
    // Otherwise fetch the full article by slug
    setLoadingArticle(true);
    setActiveArticle({ ...article, content: '' });
    try {
      const full = await getArticleBySlug(article.slug);
      if (full) setActiveArticle(full);
    } catch {
      // Show what we have
    } finally {
      setLoadingArticle(false);
    }
  };

  // An empty blog is a legitimate state on a new site, so the section still
  // hides itself — but now it says why in the console rather than leaving you
  // to wonder whether it ever rendered.
  if (!loading && articles.length === 0) return null;

  return (
    <>
      <Section id="blog" className="py-32 sm:py-44 lg:py-56">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow={content.eyebrow}
            title={content.headline}
            lead={content.lead}
          />
          <a
            href="/blog"
            className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] text-ink transition-colors hover:border-line-2 lg:self-end lg:mb-2"
          >
            {content.view_all}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {loading ? (
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-64 rounded-3xl bg-surface-2 animate-pulse" />
            ))}
          </div>
        ) : (
          <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a, i) => (
              <ArticleCard key={a.id} article={a} index={i} onClick={openArticle} />
            ))}
          </Stagger>
        )}
      </Section>

      {/* Article reader modal — opens wide */}
      <Dialog open={!!activeArticle} onOpenChange={(open) => { if (!open) setActiveArticle(null); }}>
        <DialogContent className="max-w-3xl rounded-3xl border-line bg-surface p-0 overflow-hidden max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">
            {activeArticle?.title ?? 'Article'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Full article view
          </DialogDescription>
          {activeArticle && (
            loadingArticle && !activeArticle.content ? (
              <div className="flex h-64 items-center justify-center">
                <div className="size-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
              </div>
            ) : (
              <ArticleReader article={activeArticle} onClose={() => setActiveArticle(null)} />
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
