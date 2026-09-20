import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublishedArticles } from '../lib/queries/articles';
import { Button, PageHeader, Pill, Section } from '../components/primitives';
import { useSiteContent } from '../lib/queries/siteContent';
import Img from '../components/Img';

function ArticleCard({ article, readMore }) {
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <Link
      to={`/blog/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-all duration-300 hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5"
    >
      {/* The cover, when there is one. A card with no picture keeps the shape
          it always had rather than reserving a grey rectangle for a photo
          nobody uploaded — a blog where half the posts have covers should not
          look like a blog where half the images are broken. */}
      {article.cover_image && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-peach-50">
          <Img
            src={article.cover_image}
            alt={article.cover_alt}
            focal={article.cover_focal}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
      <div className="flex items-center gap-2">
        {article.category && (
          <Pill tone="rose">{article.category}</Pill>
        )}
        {date && <span className="text-[12px] text-ink-4">{date}</span>}
      </div>
      <h2 className="t-card-title mt-4 font-display text-xl leading-snug tracking-tight text-ink group-hover:text-ink transition-colors">
        {article.title}
      </h2>
      {article.excerpt && (
        <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-ink-3">{article.excerpt}</p>
      )}
      <div className="mt-auto flex items-center gap-1.5 pt-5 text-[13px] font-medium text-ink">
        {readMore}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
      </div>
    </Link>
  );
}

export default function BlogIndexPage() {
  const content = useSiteContent('blog');
  const resources = useSiteContent('resources');
  const categories = Array.isArray(content.categories) && content.categories.length ? content.categories : ['All'];
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const pageSize = 9;

  useEffect(() => {
    setLoading(true);
    listPublishedArticles({ page, pageSize, category: category === 'All' || !category ? null : category })
      .then(({ articles: data, total: t }) => {
        setArticles(data ?? []);
        setTotal(t ?? 0);
      })
      .catch(() => {
        setArticles([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, category]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.headline}
        lead={content.lead}
        image={resources.image_url}
        imageAlt={resources.image_alt}
      />

      <Section className="py-12 sm:py-16">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategory(cat === 'All' ? null : cat); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-[13px] transition-all duration-200 ${
                (cat === 'All' && !category) || cat === category
                  ? 'bg-ink text-on-ink'
                  : 'bg-surface-2 text-ink-3 hover:bg-surface-3 hover:text-ink'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-52 rounded-3xl bg-surface-2 animate-pulse" />
              ))
            : articles.length > 0
              ? articles.map((a) => <ArticleCard key={a.id} article={a} readMore={content.read_more} />)
              : (
                <div className="col-span-3 py-24 text-center text-ink-4">
                  {content.empty}
                </div>
              )
          }
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-14 flex justify-center gap-2">
            <Button variant="quiet" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              {content.prev}
            </Button>
            <span className="flex items-center px-4 text-[13px] text-ink-3">
              {page} / {totalPages}
            </span>
            <Button variant="quiet" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              {content.next}
            </Button>
          </div>
        )}
      </Section>
    </>
  );
}
