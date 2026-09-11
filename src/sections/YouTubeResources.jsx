import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { listFeaturedVideos } from '../lib/queries/youtube';
import { Section, SectionHeading, Stagger, staggerItem } from '../components/primitives';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSiteContent } from '../lib/queries/siteContent';
import { notifySectionsChanged } from '../lib/sections';

function formatDuration(sec) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function VideoCard({ video, onPlay }) {
  const thumb = video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`;

  return (
    <motion.div variants={staggerItem}>
      <button
        onClick={() => onPlay(video)}
        className="group relative flex w-full flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-card)] transition-all duration-500 hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 text-left"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
          <img
            src={thumb}
            alt={video.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-ink/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex size-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 text-ink">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </div>
          {/* Duration badge */}
          {video.duration_sec && (
            <span className="absolute bottom-2 right-2 rounded-md bg-ink/80 px-1.5 py-0.5 text-[11px] text-white font-mono">
              {formatDuration(video.duration_sec)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-2 p-5">
          {video.category && (
            <span className="inline-flex items-center self-start rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-medium text-ink">
              {video.category}
            </span>
          )}
          <h3 className="font-display text-[1.05rem] leading-snug tracking-tight text-ink line-clamp-2 group-hover:text-ink transition-colors">
            {video.title}
          </h3>
          {video.curator_note && (
            <p className="text-[12.5px] leading-relaxed text-ink-4 italic line-clamp-2">
              {video.curator_note}
            </p>
          )}
        </div>
      </button>
    </motion.div>
  );
}

export default function YouTubeResources() {
  const content = useSiteContent('resources');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    let alive = true;
    listFeaturedVideos(6)
      .then((rows) => { if (alive) setVideos(rows ?? []); })
      .catch((err) => {
        if (alive) console.error('[lumen] could not load video resources', err);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
        // The nav decides whether to show a "Videos" link based on whether
        // this section is in the document — tell it once we know.
        queueMicrotask(notifySectionsChanged);
      });
    return () => { alive = false; };
  }, []);

  // No featured videos yet: the section hides itself. Add some from the admin
  // (YouTube → Add video, tick "Featured") and it appears on the next load.
  if (!loading && videos.length === 0) return null;

  return (
    <>
      <Section id="resources" className="py-32 sm:py-44 lg:py-56">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.headline}
          lead={content.lead}
        />

        {loading ? (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-video rounded-3xl bg-surface-2 animate-pulse" />
            ))}
          </div>
        ) : (
          <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} onPlay={setPlaying} />
            ))}
          </Stagger>
        )}
      </Section>

      {/* YouTube embed modal — iframe only rendered when open to avoid pre-load */}
      <Dialog open={!!playing} onOpenChange={(open) => { if (!open) setPlaying(null); }}>
        <DialogContent className="max-w-3xl rounded-3xl border-line bg-ink p-0 overflow-hidden">
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
    </>
  );
}
