import { Link } from 'react-router-dom';
import { Button, Section } from '../components/primitives';

export default function NotFoundPage() {
  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center bg-bg">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="backdrop-soft absolute inset-0" />
      </div>
      <Section className="relative z-10 py-24 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-4">404</p>
        <h1 className="mt-4 font-display text-5xl tracking-tight text-ink sm:text-7xl">
          Page not found
        </h1>
        <p className="mt-6 max-w-[40ch] text-[16px] leading-relaxed text-ink-3 mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/">
            <Button variant="glow" icon="arrow">Back to home</Button>
          </Link>
          <Link to="/blog">
            <Button variant="outline">Read our blog</Button>
          </Link>
        </div>
      </Section>
    </div>
  );
}
