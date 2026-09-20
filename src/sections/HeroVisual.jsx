import { Component, Suspense, lazy, useCallback, useState } from 'react';
import { useInView } from '../lib/hooks';
import { useQuality } from '../motion/useQuality';
import Img from '../components/Img';

/**
 * The hero's right-hand column: the organic form on a device that can carry
 * it, the practice's photograph everywhere else.
 *
 * The photograph is not a consolation prize. It is the answer to four separate
 * cases that all want the same thing — someone who asked their operating
 * system for less motion, a device too slow or too metered to be asked, a
 * browser with no WebGL, and a context that fails after it has started. It
 * stays a CMS field doing a real job, which is also why this change needed no
 * schema work.
 *
 * Both branches sit in the same 5:4 box, with the same corner radius and the
 * same shadow, so which one you get never moves the page by a pixel.
 */

const LumenForm = lazy(() => import('../three/LumenForm'));

/**
 * Catches a failure in the render phase. The effect-phase failures — a context
 * refused at construction, a context lost later — report themselves through
 * onError instead, because those are the likely ones and a callback is a more
 * certain path than relying on a boundary to see an error thrown from a hook.
 */
class FormBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('[lumen] hero form failed to render, using the photograph', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Photo({ src, alt }) {
  return (
    <Img
      src={src}
      alt={alt}
      fetchPriority="high"
      decoding="async"
      className="h-full w-full object-cover"
    />
  );
}

export default function HeroVisual({ imageUrl, imageAlt = '', children }) {
  const { tier, maxDpr } = useQuality();
  const [failed, setFailed] = useState(false);
  // Repeating, not once: the whole point is to stop rendering when the hero
  // has scrolled away.
  const [ref, inView] = useInView({ once: false, threshold: 0.05 });

  // Stable, because LumenForm holds it in the dependency list of the effect
  // that builds the entire scene. A new identity every render would tear the
  // renderer down and rebuild it on every render.
  const onError = useCallback(() => setFailed(true), []);

  const photo = <Photo src={imageUrl} alt={imageAlt} />;
  const showForm = tier !== 'static' && !failed;

  return (
    <div className="relative">
      {/* The flat brand panel offset behind the frame. It was holding the
          photograph off the tint before, and it does the same job here. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-7 -left-7 hidden h-full w-full rounded-[2rem] bg-brand-200 sm:block"
      />

      <div
        ref={ref}
        className="relative overflow-hidden rounded-[2rem] bg-surface-2 shadow-[var(--shadow-lift)]"
        style={{ aspectRatio: '5 / 4' }}
      >
        {showForm ? (
          <FormBoundary fallback={photo}>
            {/* Nothing is shown while the chunk is in flight. The box is
                already the colour the form sits on, so a beat of empty frame
                is calm; swapping a photograph in and straight back out again
                would not be. */}
            <Suspense fallback={null}>
              <LumenForm tier={tier} maxDpr={maxDpr} active={inView} onError={onError} />
            </Suspense>
          </FormBoundary>
        ) : (
          photo
        )}
      </div>

      {children}
    </div>
  );
}
