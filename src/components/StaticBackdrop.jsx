/**
 * CSS-only stand-in for the WebGL scene. Used while the 3D chunk loads, and
 * permanently for anyone who has asked for reduced motion — for whom a
 * perpetually animating canvas is the wrong answer, not a smaller one.
 */
export default function StaticBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute left-[62%] top-[42%] size-[min(78vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90 blur-[2px] lg:left-[68%]"
        style={{
          background: `
            radial-gradient(38% 38% at 36% 30%, rgba(45,212,191,0.55), transparent 60%),
            radial-gradient(52% 52% at 70% 72%, rgba(147,102,245,0.48), transparent 64%),
            radial-gradient(closest-side, rgba(226,234,246,0.9), rgba(244,246,251,0) 76%)
          `,
        }}
      />
      <div
        className="absolute left-[62%] top-[42%] size-[min(96vw,940px)] -translate-x-1/2 -translate-y-1/2 rounded-full lg:left-[68%]"
        style={{
          background:
            'radial-gradient(closest-side, transparent 62%, rgba(13,148,136,0.16) 66%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 45% at 20% 12%, rgba(99,102,241,0.10), transparent 70%)',
        }}
      />
    </div>
  );
}
