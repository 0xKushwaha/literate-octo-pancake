import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Orb from './Orb';
import Particles from './Particles';
import PointShell from './PointShell';
import Rings from './Rings';

const TIERS = {
  high: { detail: 56, particles: 2200, shell: 7000, dpr: [1, 2] },
  medium: { detail: 42, particles: 1400, shell: 5000, dpr: [1, 1.6] },
  low: { detail: 28, particles: 800, shell: 2500, dpr: [1, 1.35] },
  static: { detail: 24, particles: 500, shell: 1800, dpr: [1, 1.25] },
};

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

  return (
    <Canvas
      className={className}
      dpr={cfg.dpr}
      frameloop={tier === 'static' ? 'demand' : 'always'}
      camera={{ position: [0, 0, 5.6], fov: 42, near: 0.1, far: 60 }}
      gl={{
        antialias: true,
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
