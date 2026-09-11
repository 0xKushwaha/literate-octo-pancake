import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getArticleBySlug, getRelatedArticles } from '../lib/queries/articles';
import { Button, Pill, Section } from '../components/primitives';
import { useBrand } from '../lib/queries/siteContent';
import { sanitizeHtml } from '../lib/sanitizeHtml';

function estimateReadTime(content) {
  if (!content) return 1;
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default function BlogPostPage() {
  const brand = useBrand();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getArticleBySlug(slug)
      .then((a) => {
        if (a) {
          setArticle(a);
          if (a.category) getRelatedArticles(a.category, slug).then(setRelated);
        } else {
          navigate('/blog', { replace: true });
        }
      })
      .catch(() => {
        navigate('/blog', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  const date = article?.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-bg grain">
      {/* Nav */}
      <header className="border-b border-line bg-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="relative grid size-6 place-items-center">
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-300 to-amber-500 opacity-90 blur-[5px]" />
              <span className="relative size-2 rounded-full bg-ink" />
            </span>
            <span className="font-display text-[22px] leading-none tracking-tight">{brand.name}</span>
          </Link>
          <Link to="/blog" className="text-[14px] text-ink-3 hover:text-ink transition-colors">← All articles</Link>
        </div>
      </header>

      {loading ? (
        <Section className="py-20">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="h-6 w-24 rounded-full bg-surface-2 animate-pulse" />
            <div className="h-12 rounded-2xl bg-surface-2 animate-pulse" />
            <div className="h-4 w-48 rounded-full bg-surface-2 animate-pulse" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 rounded-full bg-surface-2 animate-pulse" style={{ width: `${80 + Math.random() * 20}%` }} />
            ))}
          </div>
        </Section>
      ) : article ? (
        <>
          <Section className="py-16">
            <div className="mx-auto max-w-2xl">
              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3">
                {article.category && <Pill accent="rose" size="sm">{article.category}</Pill>}
                {date && <span className="text-[13px] text-ink-4">{date}</span>}
                <span className="text-[13px] text-ink-4">·</span>
                <span className="text-[13px] text-ink-4">{estimateReadTime(article.content)} min read</span>
              </div>

              <h1 className="mt-5 font-display text-4xl leading-[1.1] tracking-tight text-ink sm:text-5xl">
                {article.title}
              </h1>

              {article.excerpt && (
                <p className="mt-5 text-[17px] leading-relaxed text-ink-3">{article.excerpt}</p>
              )}

              <div className="mt-10 h-px bg-line" />

              {/* Article body */}
              <div
                className="prose-lumen mt-10"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
              />

              <div className="mt-16 h-px bg-line" />

              {/* CTA */}
              <div className="mt-10 rounded-3xl border border-line bg-surface-2 p-8 text-center">
                <p className="font-display text-2xl tracking-tight text-ink">Ready to talk to someone?</p>
                <p className="mt-3 text-[14.5px] text-ink-3">Our therapists are accepting new clients.</p>
                <Link to="/" className="mt-6 inline-block">
                  <Button variant="glow" icon="arrow">Book a session</Button>
                </Link>
              </div>
            </div>
          </Section>

          {/* Related articles */}
          {related.length > 0 && (
            <div className="border-t border-line bg-surface-2">
              <Section className="py-16">
                <h2 className="font-display text-2xl tracking-tight text-ink">Related articles</h2>
                <div className="mt-8 grid gap-5 sm:grid-cols-3">
                  {related.map((a) => (
                    <Link
                      key={a.id}
                      to={`/blog/${a.slug}`}
                      className="group rounded-2xl border border-line bg-surface p-5 transition-all hover:shadow-[var(--shadow-card)]"
                    >
                      {a.category && <Pill accent="rose" size="sm">{a.category}</Pill>}
                      <h3 className="mt-3 font-display text-[17px] leading-snug tracking-tight text-ink group-hover:text-ink transition-colors">
                        {a.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              </Section>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
