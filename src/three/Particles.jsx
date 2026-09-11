import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { simplex3d, rotation } from './glsl';

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uScroll;
uniform float uPixelRatio;

attribute float aSeed;
attribute float aScale;
attribute float aSpeed;

varying float vSeed;
varying float vFade;

${simplex3d}
${rotation}

void main(){
  vec3 p = position;
  float r = length(p);

  // differential rotation — inner particles orbit faster
  float spin = uTime * aSpeed * (1.6 / max(r, 0.6));
  p = rotateY(spin) * p;
  p = rotateX(sin(uTime * 0.12 + aSeed * 6.28) * 0.16) * p;

  // organic drift
  vec3 drift = vec3(
    snoise(p * 0.35 + vec3(uTime * 0.11, aSeed, 0.0)),
    snoise(p * 0.35 + vec3(0.0, uTime * 0.13 + aSeed, 4.0)),
    snoise(p * 0.35 + vec3(8.0, aSeed, uTime * 0.09))
  );
  p += drift * 0.26;

  // pull toward the core as the page scrolls
  p *= 1.0 - uScroll * 0.28;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float twinkle = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed * 2.4) + aSeed * 12.0);
  gl_PointSize = uSize * aScale * twinkle * uPixelRatio * (7.5 / -mv.z);

  vSeed = aSeed;
  vFade = smoothstep(2.0, 5.0, -mv.z) * smoothstep(22.0, 11.0, -mv.z) * twinkle;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;

varying float vSeed;
varying float vFade;

void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;

  float core = smoothstep(0.5, 0.0, d);
  float glow = pow(core, 3.0);

  vec3 col = mix(uColorA, uColorB, vSeed);
  gl_FragColor = vec4(col, (glow * 1.0 + core * 0.22) * vFade * uOpacity);

  #include <colorspace_fragment>
}
`;

export default function Particles({ count = 2600, scrollRef, dpr = 1.5 }) {
  const mat = useRef();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const scale = new Float32Array(count);
    const speed = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // biased toward a shell just outside the orb
      const r = 3.4 + Math.pow(Math.random(), 0.6) * 6.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      // flatten slightly into a disc for an accretion feel
      const flat = 0.72;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * flat;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      seed[i] = Math.random();
      scale[i] = 0.3 + Math.pow(Math.random(), 2.6) * 1.5;
      speed[i] = 0.06 + Math.random() * 0.16;
    }

    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 2.8 },
      uScroll: { value: 0 },
      uOpacity: { value: 0.72 },
      uPixelRatio: { value: dpr },
      uColorA: { value: new THREE.Color('#FFB0B5') },
      uColorB: { value: new THREE.Color('#FFBF00') },
    }),
    [dpr],
  );

  useFrame((state, delta) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uScroll.value = THREE.MathUtils.damp(
      uniforms.uScroll.value,
      scrollRef?.current ?? 0,
      3,
      delta,
    );
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
