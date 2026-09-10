import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isDemo } from '../../lib/supabase';
import { demoArticles, demoExercises, demoVideos, demoBookings } from '../../lib/demoData';

function StatCard({ label, value, to }) {
  const inner = (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value ?? '—'}</p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (isDemo) {
      setStats({
        bookings: demoBookings.list().length,
        articles: demoArticles.listAll().length,
        exercises: demoExercises.listAll().length,
        videos: demoVideos.listAll().length,
      });
      return;
    }
    async function load() {
      const [bookings, articles, exercises, videos] = await Promise.all([
        supabase.from('booking_submissions').select('id', { count: 'exact', head: true }),
        supabase.from('articles').select('id', { count: 'exact', head: true }),
        supabase.from('breathing_exercises').select('id', { count: 'exact', head: true }),
        supabase.from('youtube_resources').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        bookings: bookings.count,
        articles: articles.count,
        exercises: exercises.count,
        videos: videos.count,
      });
    }
    load().catch(() => {});
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Overview of your Lumen platform</p>

      {isDemo && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            <strong>Demo mode</strong> — Supabase credentials not configured. Data shown is sample data.
            Update <code className="rounded bg-amber-100 px-1 font-mono text-xs">.env</code> with real credentials to connect.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Booking requests" value={stats.bookings} to="/admin/bookings" />
        <StatCard label="Blog articles" value={stats.articles} to="/admin/blog" />
        <StatCard label="Breathing exercises" value={stats.exercises} to="/admin/breathing" />
        <StatCard label="YouTube resources" value={stats.videos} to="/admin/youtube" />
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-medium text-gray-700">Quick links</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { to: '/admin/blog/new', label: 'New blog post' },
            { to: '/admin/bookings', label: 'View bookings' },
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
    </div>
  );
}
