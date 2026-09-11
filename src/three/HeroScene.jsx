import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Orb from './Orb';
import Particles from './Particles';
import PointShell from './PointShell';
import Rings from './Rings';

/**
 * Counts and pixel density per device tier.
 *
 * `dpr` is the setting that actually decides whether this feels smooth. It is a
 * linear multiplier on width AND height, so dpr 2 asks the GPU for four times
 * the fragments of dpr 1 — every frame, forever. On a retina laptop the old
 * ceiling of 2 was quadrupling the cost of a scene that is entirely soft
 * gradients and additive points, where the extra density is close to invisible.
 * 1.6 is the point where this particular content stops looking any better.
 */
const TIERS = {
  high: { detail: 48, particles: 1500, shell: 4500, dpr: [1, 1.6] },
  medium: { detail: 38, particles: 1000, shell: 3200, dpr: [1, 1.4] },
  low: { detail: 26, particles: 600, shell: 1800, dpr: [1, 1.25] },
  static: { detail: 22, particles: 400, shell: 1200, dpr: [1, 1.25] },
};

/**
 * How far past the first viewport the scene keeps rendering.
 *
 * The canvas is a `fixed inset-0` backdrop, so an IntersectionObserver always
 * reports it as on-screen — it never leaves the viewport, it just ends up
 * behind opaque content. Without an explicit cutoff it therefore renders every
 * frame for the entire length of the page, which is most of the cost of
 * scrolling this site. The hero fades out over the first screen, so there is
 * nothing left to see much past it.
 *
 * The two thresholds are deliberately different: resuming earlier than we pause
 * stops a scroll position parked exactly on the boundary from flipping the
 * renderer on and off on every wheel tick.
 */
const PAUSE_AFTER = 1.35;
const RESUME_BEFORE = 1.15;

/** True while the scene is worth drawing: near the hero, and the tab is visible. */
function useSceneActive(heroRef) {
  const [active, setActive] = useState(true);

  useEffect(() => {
    let frame = 0;
    let current = true;

    const evaluate = () => {
      frame = 0;
      const past = heroRef?.current ?? 0;
      const next = document.hidden ? false : current ? past < PAUSE_AFTER : past < RESUME_BEFORE;
      if (next !== current) {
        current = next;
        setActive(next);
      }
    };

    // Coalesced into one rAF per frame: the scroll handler itself must not be
    // the thing that makes scrolling expensive.
    const schedule = () => { if (!frame) frame = requestAnimationFrame(evaluate); };

    evaluate();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('visibilitychange', evaluate);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', evaluate);
    };
  }, [heroRef]);

  return active;
}

function SceneContent({ tier, heroRef, scrollRef }) {
  const cfg = TIERS[tier] ?? TIERS.high;
  const group = useRef();
  const { camera, size } = useThree();
  const pointer = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const p = state.pointer;
    const damping = tier === 'static' ? 0 : 2.4;
    if (damping) {
      pointer.current.x = THREE.MathUtils.damp(pointer.current.x, p.x, damping, delta);
      pointer.current.y = THREE.MathUtils.damp(pointer.current.y, p.y, damping, delta);
    }

    const hero = heroRef?.current ?? 0;

    if (group.current) {
      group.current.rotation.y = pointer.current.x * 0.32;
      group.current.rotation.x = -pointer.current.y * 0.22;
      // wide: sit right of centre so the headline keeps clean ground.
      // narrow: drop below the copy instead, where there is nothing to obscure.
      const wide = size.width >= 1024;
      const offsetX = wide ? 1.85 : 0;
      const offsetY = wide ? 0 : -1.9;
      group.current.position.x = THREE.MathUtils.damp(group.current.position.x, offsetX, 3, delta);
      group.current.position.y = THREE.MathUtils.damp(
        group.current.position.y,
        offsetY + hero * 1.2,
        3,
        delta,
      );
      group.current.scale.setScalar((wide ? 1 : 0.82) - hero * 0.15);
    }

    const narrow = size.width < 760 ? 1.6 : 0;
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 5.6 + hero * 2.6 + narrow, 3, delta);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.current.x * 0.4, 2, delta);
    camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={group}>
      <Orb detail={cfg.detail} scrollRef={scrollRef} />
      <PointShell count={cfg.shell} scrollRef={scrollRef} />
      <Rings scrollRef={scrollRef} />
      <Particles count={cfg.particles} scrollRef={scrollRef} />
    </group>
  );
}

export default function HeroScene({ tier = 'high', heroRef, scrollRef, className = '' }) {
  const cfg = TIERS[tier] ?? TIERS.high;
  const active = useSceneActive(heroRef);

  return (
    <Canvas
      className={className}
      dpr={cfg.dpr}
      // 'demand' renders only when something asks it to. Nothing here does, so
      // this is a full stop rather than a slowdown: no GPU work at all once the
      // hero is behind you, and none while the tab is in the background.
      frameloop={tier === 'static' || !active ? 'demand' : 'always'}
      camera={{ position: [0, 0, 5.6], fov: 42, near: 0.1, far: 60 }}
      gl={{
        // Off deliberately. MSAA costs real time per frame, and this scene has
        // no hard edges to alias — it is additive points and soft gradients, so
        // the only thing antialiasing changed here was the frame budget.
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
    >
      <Suspense fallback={null}>
        <SceneContent tier={tier} heroRef={heroRef} scrollRef={scrollRef} />
      </Suspense>
    </Canvas>
  );
}
