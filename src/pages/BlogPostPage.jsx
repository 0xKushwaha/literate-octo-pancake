import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getArticleBySlug, getRelatedArticles } from '../lib/queries/articles';
import { Button, Pill, Section } from '../components/primitives';
import { brand } from '../data/site';

const FALLBACK_POSTS = {
  'first-therapy-session': {
    id: 'blog-1', title: 'What Actually Happens in Your First Therapy Session', slug: 'first-therapy-session',
    excerpt: 'The anticipation is almost always worse than the thing itself.',
    category: 'Getting Started', published_at: '2026-08-28',
    content: `<p>If you've been putting off booking a therapy session, you're not alone. The unknown is often the biggest barrier — not cost, not time, but simply not knowing what's going to happen once you sit down (or log on).</p>
<h2>Before the session</h2>
<p>Most practices will send you a brief intake form. At Lumen, it takes about two minutes. You'll share what brought you here (in broad strokes — "anxiety" is enough), your availability, and whether you have a preference for video or in-person.</p>
<h2>The first 10 minutes</h2>
<p>Your therapist will introduce themselves, explain confidentiality, and ask an open-ended question — usually some version of "What made you reach out now?" You don't need a polished answer. "I've been feeling off for a while" is a perfectly fine place to start.</p>
<h2>The rest of the session</h2>
<p>Think of it as a conversation with guardrails. Your therapist will follow your lead while gently steering toward what seems most pressing. They might ask clarifying questions, reflect back what they hear, or name something you haven't named yet.</p>
<p>You will <em>not</em> be asked to recount your entire life history. That's a myth from movies. Most therapists today work with what's alive right now.</p>
<h2>What you absolutely don't have to do</h2>
<ul><li>Cry (though it's fine if you do)</li><li>Have a "breakthrough"</li><li>Share anything you're not ready to share</li><li>Commit to coming back</li></ul>
<h2>After the session</h2>
<p>You might feel lighter, or you might feel stirred up. Both are normal. Many people describe the first session as "surprisingly okay." The hardest part was booking it.</p>`,
  },
  'anxiety-vs-worry': {
    id: 'blog-2', title: 'Anxiety vs. Worry: When Normal Stress Becomes a Clinical Concern', slug: 'anxiety-vs-worry',
    excerpt: 'Everyone worries. But when worry starts running your calendar, that\'s different.',
    category: 'Anxiety', published_at: '2026-08-15',
    content: `<p>Worry is a thinking problem. Anxiety is a <em>body</em> problem. That distinction matters more than most people realise.</p>
<h2>Normal worry</h2>
<p>Worry is specific ("Will I get the job?"), time-limited, and proportional. It resolves when the situation resolves. You can still function, even if you're distracted.</p>
<h2>Clinical anxiety</h2>
<p>Anxiety generalises. One worry bleeds into the next. Your body stays activated — tight chest, racing heart, disrupted sleep — even when there's no clear threat. The hallmark is that it's <strong>disproportionate</strong> to the situation and <strong>persistent</strong> beyond it.</p>
<h2>The physical dimension</h2>
<p>Anxiety isn't just "in your head." It lives in your nervous system: muscle tension, digestive issues, shortness of breath, fatigue that sleep doesn't fix. If your body is running a threat-detection programme 24/7, it's going to use a lot of energy.</p>
<h2>When to seek help</h2>
<p>A useful threshold: if worry is changing your behaviour — avoiding situations, cancelling plans, checking things repeatedly, or struggling to be present — that's worth talking to someone about.</p>
<p>Anxiety is one of the most treatable mental health conditions. Structured approaches like CBT and ACT have decades of evidence behind them, and many people feel meaningful improvement within 8–12 sessions.</p>`,
  },
  'science-of-breathing': {
    id: 'blog-3', title: 'The Science Behind Breathing Exercises (And Why They Work So Fast)', slug: 'science-of-breathing',
    excerpt: 'Controlled breathing directly engages your vagus nerve.',
    category: 'Techniques', published_at: '2026-08-02',
    content: `<p>When someone tells you to "just breathe" during a panic attack, it can feel dismissive. But the science is surprisingly robust — and the mechanism is fascinatingly direct.</p>
<h2>The vagus nerve: your body's brake pedal</h2>
<p>The vagus nerve is the longest cranial nerve in your body, running from your brainstem to your abdomen. It's the main channel of your parasympathetic nervous system — the "rest and digest" side that counterbalances fight-or-flight.</p>
<p>When you exhale slowly, you stimulate the vagus nerve. This directly slows your heart rate, lowers blood pressure, and signals your brain that you are safe.</p>
<h2>Why exhale matters more than inhale</h2>
<p>Your heart rate naturally increases on inhale and decreases on exhale. This is called respiratory sinus arrhythmia, and it's why techniques like 4-7-8 breathing emphasise a longer exhale. You're literally using your breath to pull the brake.</p>
<h2>The 90-second rule</h2>
<p>Neuroanatomist Jill Bolte Taylor observed that the chemical lifespan of an emotion in the body is roughly 90 seconds. If you can ride out that window with controlled breathing, the acute intensity passes. What remains is the story you tell yourself about the feeling — and that's something therapy can help with.</p>
<h2>Which technique is best?</h2>
<p>Honestly, the one you'll actually do. Box breathing (4-4-4-4) is excellent for focus. The 4-7-8 technique is better for sleep. Triangle breathing (4-4-4) is gentle enough for beginners. Try all three and notice which one your body responds to.</p>`,
  },
  'burnout-vs-stress': {
    id: 'blog-4', title: '5 Signs You Might Be Experiencing Burnout (Not Just Stress)', slug: 'burnout-vs-stress',
    excerpt: 'Burnout isn\'t just being tired. It\'s the point where effort stops producing results.',
    category: 'Mindfulness', published_at: '2026-07-20',
    content: `<p>Stress and burnout look similar from the outside but feel very different from the inside. Stress is characterised by <em>over-engagement</em> — too much urgency, too much emotion, too much effort. Burnout is characterised by <em>disengagement</em> — numbness, detachment, and the sense that nothing you do matters.</p>
<h2>1. Exhaustion that sleep doesn't fix</h2>
<p>You've had a full weekend. You slept eight hours. And Monday morning feels exactly as heavy as Friday evening. This isn't fatigue — it's depletion.</p>
<h2>2. Cynicism about work you used to care about</h2>
<p>You catch yourself thinking "what's the point?" about projects that once excited you. This isn't laziness — it's your mind protecting itself from further disappointment.</p>
<h2>3. Reduced efficacy</h2>
<p>Tasks that took an hour now take three. Not because they're harder, but because your cognitive resources are genuinely depleted. This is the most measurable sign.</p>
<h2>4. Physical symptoms without medical cause</h2>
<p>Headaches, stomach problems, frequent illness. Your doctor can't find anything wrong because the cause isn't organic — it's systemic overload.</p>
<h2>5. Emotional blunting</h2>
<p>You stop feeling bad, but you also stop feeling good. Weekends feel like waiting rooms. This is the stage where people often say "I'm fine" and mean it — because they genuinely can't feel anything strong enough to call it otherwise.</p>`,
  },
  'how-emdr-works': {
    id: 'blog-5', title: 'How EMDR Actually Works: A Therapist Explains', slug: 'how-emdr-works',
    excerpt: 'Eye Movement Desensitization and Reprocessing sounds like pseudoscience. It isn\'t.',
    category: 'Trauma', published_at: '2026-07-08',
    content: `<p>EMDR (Eye Movement Desensitization and Reprocessing) is one of the most evidence-based treatments for trauma — endorsed by the WHO, the VA, and the APA. It also sounds, frankly, implausible. Here's why it works.</p>
<h2>The stuck memory model</h2>
<p>When something traumatic happens, the memory can get "stuck" — stored in a raw, unprocessed form that includes the original emotions, sensations, and beliefs ("I'm not safe," "It was my fault"). Unlike normal memories, these don't fade with time.</p>
<h2>What bilateral stimulation does</h2>
<p>During EMDR, you recall the traumatic memory while following a bilateral stimulus — usually your therapist's finger moving side to side, or alternating taps. This activates both hemispheres of your brain simultaneously.</p>
<p>The leading theory is that this mimics what happens during REM sleep, when your brain naturally processes and consolidates memories. EMDR essentially restarts a process that got interrupted.</p>
<h2>What changes</h2>
<p>After successful EMDR, you still remember what happened — but the emotional charge is dramatically reduced. The memory moves from "this is happening to me right now" to "this is something that happened in the past." That shift is measurable on brain scans.</p>
<h2>What it's like in practice</h2>
<p>Sessions last 60–90 minutes. You'll spend the first few sessions building coping resources and identifying target memories. The processing itself can feel intense but is carefully paced. Most people notice significant improvement within 6–12 sessions.</p>`,
  },
  'couples-therapy-prevention': {
    id: 'blog-6', title: 'Couples Therapy Isn\'t Just for Couples in Crisis', slug: 'couples-therapy-prevention',
    excerpt: 'The best time to start couples therapy is when things are mostly fine.',
    category: 'Relationships', published_at: '2026-06-25',
    content: `<p>There's a statistic that haunts couples therapists: the average couple waits <strong>six years</strong> after problems begin before seeking help. By then, patterns are deeply entrenched and resentment has had time to calcify.</p>
<h2>The maintenance model</h2>
<p>Think of couples therapy the way you think of a car service. You don't wait until the engine seizes. You do regular check-ups so small issues get caught before they become structural.</p>
<h2>What "preventive" couples therapy looks like</h2>
<p>It's not crisis work. It's more like having a skilled translator in the room. You learn to:</p>
<ul><li>Name what you actually need (not what you're arguing about)</li><li>Hear your partner's bid for connection, even when it comes out as criticism</li><li>Repair after a fight — quickly, without the silent treatment</li><li>Talk about money, sex, and in-laws without it becoming a referendum on the relationship</li></ul>
<h2>The Gottman research</h2>
<p>Dr. John Gottman's research at the University of Washington identified that the presence of "The Four Horsemen" — criticism, contempt, defensiveness, and stonewalling — predicts divorce with over 90% accuracy. The good news: all four are learnable skills to counteract.</p>
<h2>When is the right time?</h2>
<p>Now. Seriously. If you're reading this and thinking "we're pretty good, but…" — that "but" is exactly the kind of thing that's easy to address now and very hard to address in three years.</p>`,
  },
};

function estimateReadTime(content) {
  if (!content) return 1;
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default function BlogPostPage() {
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
          // Fall back to demo content
          const fallback = FALLBACK_POSTS[slug];
          if (fallback) {
            setArticle(fallback);
            const rel = Object.values(FALLBACK_POSTS).filter((p) => p.slug !== slug).slice(0, 3);
            setRelated(rel);
          } else {
            navigate('/blog', { replace: true });
          }
        }
      })
      .catch(() => {
        const fallback = FALLBACK_POSTS[slug];
        if (fallback) {
          setArticle(fallback);
          const rel = Object.values(FALLBACK_POSTS).filter((p) => p.slug !== slug).slice(0, 3);
          setRelated(rel);
        } else {
          navigate('/blog', { replace: true });
        }
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
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-aqua-400 to-violet-400 opacity-90 blur-[5px]" />
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
                {article.category && <Pill accent="aqua" size="sm">{article.category}</Pill>}
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
                dangerouslySetInnerHTML={{ __html: article.content ?? '' }}
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
                      {a.category && <Pill accent="aqua" size="sm">{a.category}</Pill>}
                      <h3 className="mt-3 font-display text-[17px] leading-snug tracking-tight text-ink group-hover:text-aqua-700 transition-colors">
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
