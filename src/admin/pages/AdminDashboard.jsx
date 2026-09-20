import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isDemo } from '../../lib/supabase';
import { demoArticles, demoExercises, demoVideos } from '../../lib/demoData';
import { PageHeader } from '../components/ui';

function StatCard({ label, value, to, loading }) {
  const inner = (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      {loading ? (
        <div className="mt-3 h-7 w-12 animate-pulse rounded bg-gray-100" />
      ) : (
        <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-900">{value ?? '—'}</p>
      )}
    </div>
  );
  return to ? (
    <Link to={to} className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
      {inner}
    </Link>
  ) : inner;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isDemo) {
      setStats({
        articles: demoArticles.listAll().length,
        exercises: demoExercises.listAll().length,
        videos: demoVideos.listAll().length,
      });
      setLoading(false);
      return;
    }
    async function load() {
      const [articles, exercises, videos] = await Promise.all([
        supabase.from('articles').select('id', { count: 'exact', head: true }),
        supabase.from('breathing_exercises').select('id', { count: 'exact', head: true }),
        supabase.from('youtube_resources').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        articles: articles.count,
        exercises: exercises.count,
        videos: videos.count,
      });
    }
    load()
      .catch((err) => {
        console.error('[lumen admin] dashboard counts failed', err);
        setError('Could not read the counts. The lists themselves may still work.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Overview of your site" />

      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Blog articles" value={stats.articles} to="/admin/blog" loading={loading} />
        <StatCard label="Breathing exercises" value={stats.exercises} to="/admin/breathing" loading={loading} />
        <StatCard label="YouTube resources" value={stats.videos} to="/admin/youtube" loading={loading} />
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-medium text-gray-700">Quick links</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { to: '/admin/blog/new', label: 'New blog post' },
            { to: '/admin/content', label: 'Edit site text' },
            { to: '/admin/faqs', label: 'Edit FAQs' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
