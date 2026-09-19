import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';

/**
 * A recording, played from one small button.
 *
 * The browser's own `controls` bar was doing too much on a testimonial card:
 * a volume slider, an overflow menu offering Download, and a chrome that
 * belongs to Chrome rather than to this site. It also showed "0:00 / 0:00"
 * until you pressed play, because preload="none" means the duration is not
 * known yet.
 *
 * So: a button, a hairline, and a time. Everything else is gone.
 *
 * `preload="metadata"` rather than "none" — it fetches a few KB of header, not
 * the clip, which is what lets the length show before anyone commits to
 * listening. Knowing it is ninety seconds and not nine minutes is most of the
 * decision.
 */

/**
 * The clip currently playing, anywhere on the page.
 *
 * A testimonial section holds three to six of these and two playing at once is
 * nobody's intention. Module scope rather than context: there is exactly one
 * pair of ears, so one module-level value is the honest model, and it keeps
 * the component usable anywhere without a provider.
 */
let sounding = null;

function clock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AudioNote({ src, label, className = '' }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [length, setLength] = useState(0);

  // Pause on unmount, or the sound carries on after a route change.
  useEffect(() => () => {
    const el = ref.current;
    if (el) el.pause();
    if (sounding === el) sounding = null;
  }, []);

  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      if (sounding && sounding !== el) sounding.pause();
      sounding = el;
      // play() rejects when a browser refuses autoplay or the file will not
      // decode. Swallowing it silently would leave a button that looks broken,
      // so the state goes back rather than lying about what is happening.
      el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, []);

  const scrub = (e) => {
    const el = ref.current;
    if (!el || !Number.isFinite(length) || length <= 0) return;
    const next = Number(e.target.value);
    el.currentTime = next;
    setAt(next);
  };

  const progress = length > 0 ? (at / length) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause: ${label}` : `Play: ${label}`}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500 text-white transition-[transform,background-color] duration-200 hover:bg-brand-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        {/* The pause bars sit on the centre; the play triangle needs a hair of
            left padding or it reads as off-centre inside a circle. */}
        <Icon name={playing ? 'pause' : 'play'} size={15} filled className={playing ? '' : 'ml-[2px]'} />
      </button>

      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor={`seek-${src}`}>{label}</label>
        <input
          id={`seek-${src}`}
          type="range"
          min={0}
          max={length || 0}
          step={0.1}
          value={at}
          onChange={scrub}
          disabled={!length}
          // A range input, not a div with a click handler: it arrives
          // keyboard-operable and announced as a slider without any of that
          // being written here, and it is the one control worth keeping on a
          // clip somebody may want to hear twice.
          className="audio-seek block h-1 w-full cursor-pointer appearance-none rounded-full bg-line disabled:cursor-default"
          style={{ '--seek': `${progress}%` }}
        />
      </div>

      <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-4">
        {clock(at)} / {clock(length)}
      </span>

      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setLength(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setAt(0); }}
        className="hidden"
      />
    </div>
  );
}
