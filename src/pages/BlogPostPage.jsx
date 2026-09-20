import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getArticleBySlug, getRelatedArticles } from '../lib/queries/articles';
import { Button, Pill, Section } from '../components/primitives';
import { usePrimaryCta } from '../lib/features';
import { useSiteContent } from '../lib/queries/siteContent';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import Img from '../components/Img';

function estimateReadTime(content) {
  if (!content) return 1;
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default function BlogPostPage() {
  // Booking when it is on, the community invite when it is not — an article
  // that ends in a button to nowhere is worse than one that just ends.
  const cta = usePrimaryCta(null);
  const content = useSiteContent('blog');
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
    <>
      {loading ? (
        <Section className="py-20">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="h-6 w-24 rounded-full bg-surface-2 animate-pulse" />
            <div className="h-12 rounded-2xl bg-surface-2 animate-pulse" />
            <div className="h-4 w-48 rounded-full bg-surface-2 animate-pulse" />
            {Array.from({ length: 8 }).map((_, i) => (
              // Widths come from the index, not Math.random(): a random value
              // read during render is recomputed on every re-render, so the
              // skeleton lines twitched to new lengths while the article
              // loaded. This ragged-edge pattern repeats every 5 lines.
              <div key={i} className="h-4 rounded-full bg-surface-2 animate-pulse" style={{ width: `${[96, 88, 99, 82, 92][i % 5]}%` }} />
            ))}
          </div>
        </Section>
      ) : article ? (
        <>
          <Section className="py-12 sm:py-16">
            <div className="mx-auto max-w-2xl">
              <Link to="/blog" className="mb-8 inline-flex items-center gap-1.5 text-[14px] text-ink-3 transition-colors hover:text-ink">
                ← {content.back_link}
              </Link>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3">
                {article.category && <Pill tone="rose">{article.category}</Pill>}
                {date && <span className="text-[13px] text-ink-4">{date}</span>}
                <span className="text-[13px] text-ink-4">·</span>
                <span className="text-[13px] text-ink-4">{estimateReadTime(article.content)} {content.read_time_suffix}</span>
              </div>

              <h1 className="t-article-title mt-5 font-display text-4xl leading-[1.1] tracking-tight text-ink sm:text-5xl">
                {article.title}
              </h1>

              {article.excerpt && (
                <p className="mt-5 text-[17px] leading-relaxed text-ink-3">{article.excerpt}</p>
              )}

              {/* The cover sits between the standfirst and the body, where a
                  magazine would put it: after the reader has decided to read
                  it, and before the first paragraph. Above the headline it
                  would push the title itself below the fold on a phone. */}
              {article.cover_image && (
                <figure className="mt-9">
                  {/* Fixed 16:9 rather than the picture's own shape. Whatever
                      gets uploaded — a portrait phone photo, a wide stock
                      landscape — the article opens the same way, and a tall
                      image cannot push the first paragraph a screen and a half
                      down the page. */}
                  <div className="aspect-[16/9] w-full overflow-hidden rounded-3xl bg-peach-50 shadow-[var(--shadow-card)]">
                    <Img
                      src={article.cover_image}
                      alt={article.cover_alt}
                      focal={article.cover_focal}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {article.cover_alt && (
                    <figcaption className="mt-3 text-[12.5px] text-ink-4">{article.cover_alt}</figcaption>
                  )}
                </figure>
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
                <p className="font-display text-2xl tracking-tight text-ink">{content.post_cta_title}</p>
                <p className="mt-3 text-[14.5px] text-ink-3">{content.post_cta_body}</p>
                {cta && (
                  <Button variant="primary" icon="arrow" className="mt-6" {...cta.props}>
                    {cta.mode === 'book' ? content.post_cta_button : cta.label}
                  </Button>
                )}
              </div>
            </div>
          </Section>

          {/* Related articles */}
          {related.length > 0 && (
            <div className="border-t border-line bg-surface-2">
              <Section className="py-16">
                <h2 className="t-section-title font-display text-2xl tracking-tight text-ink">{content.related_title}</h2>
                <div className="mt-8 grid gap-5 sm:grid-cols-3">
                  {related.map((a) => (
                    <Link
                      key={a.id}
                      to={`/blog/${a.slug}`}
                      className="group overflow-hidden rounded-2xl border border-line bg-surface transition-all hover:shadow-[var(--shadow-card)]"
                    >
                      {a.cover_image && (
                        <div className="aspect-[16/9] w-full overflow-hidden bg-peach-50">
                          <Img
                            src={a.cover_image}
                            alt={a.cover_alt}
                            focal={a.cover_focal}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        </div>
                      )}
                      <div className="p-5">
                        {a.category && <Pill tone="rose">{a.category}</Pill>}
                        <h3 className="t-card-title mt-3 font-display text-[17px] leading-snug tracking-tight text-ink group-hover:text-ink transition-colors">
                          {a.title}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            </div>
          )}
        </>
      ) : null}
    </>
  );
}
