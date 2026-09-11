import { Link } from 'react-router-dom';
import { Button, Section } from '../components/primitives';

export default function NotFoundPage() {
  return (
    <div className="backdrop-soft flex min-h-[70svh] flex-col items-center justify-center">
      <Section className="py-24 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-4">404</p>
        <h1 className="mt-4 font-display text-5xl tracking-tight text-ink sm:text-6xl">Page not found</h1>
        <p className="mx-auto mt-6 max-w-[40ch] text-[16px] leading-relaxed text-ink-3">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" icon="arrow" as={Link} to="/">
            Back to home
          </Button>
          <Button variant="secondary" as={Link} to="/resources">
            Videos and articles
          </Button>
        </div>
      </Section>
    </div>
  );
}
