import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { simplex3d } from './glsl';

/**
 * A cloud of points sitting just above the orb, displaced by the SAME noise
 * field as the mesh — so it reads as a live scan of the surface rather than
 * unrelated decoration.
 */
const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform float uBreath;
uniform float uWarp;
uniform float uSize;
uniform float uPixelRatio;
uniform float uOffset;

attribute float aSeed;

varying float vGlow;
varying float vSeed;

${simplex3d}

float displace(vec3 p){
  float t = uTime * 0.16;
  // slow, large lobes — these deform the silhouette
  float lobes  = fbm(p * uFreq + vec3(0.0, t, t * 0.4), 4, 2.05, 0.55);
  // a travelling ridge, like a wave crossing the surface
  float ridge  = 1.0 - abs(snoise(p * uFreq * 1.9 + vec3(t * 1.4, 0.0, -t)));
  // fine grain so the surface never looks like plastic
  float detail = fbm(p * uFreq * 5.2 - vec3(t * 0.6), 3, 2.2, 0.5) * 0.16;
  float swirl  = snoise(p * (uFreq * 0.45) - vec3(t * 0.8)) * uWarp;
  return (lobes * 0.9 + (ridge - 0.55) * 0.34 + detail + swirl) * uAmp + uBreath;
}

void main(){
  vec3 n = normalize(position);
  float d = displace(n);

  // each point floats at its own height above the displaced surface
  float lift = uOffset + pow(aSeed, 1.9) * 0.5;
  vec3 p = n * (1.0 + d + lift);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float pulse = 0.5 + 0.5 * sin(uTime * 1.4 + aSeed * 20.0 + d * 9.0);
  gl_PointSize = uSize * (0.3 + pow(aSeed, 2.0) * 1.3) * uPixelRatio * (14.0 / -mv.z);

  // ridge-tops glow hottest
  vGlow = smoothstep(-0.06, 0.16, d) * pow(pulse, 2.2) * (1.0 - aSeed * 0.55);
  vSeed = aSeed;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;
varying float vGlow;
varying float vSeed;

void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float mask = smoothstep(0.5, 0.06, d);
  vec3 col = mix(uColorA, uColorB, vSeed);
  gl_FragColor = vec4(col, mask * vGlow * uOpacity);
  #include <colorspace_fragment>
}
`;

export default function PointShell({ count = 9000, scrollRef, dpr = 1.5 }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    // Fibonacci sphere — even coverage, no polar clumping
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(Math.max(1 - y * y, 0));
      const th = golden * i;
      pos[i * 3] = Math.cos(th) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(th) * r;
      seed[i] = Math.random();
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.04 },
      uFreq: { value: 1.55 },
      uBreath: { value: 0 },
      uWarp: { value: 0.1 },
      uSize: { value: 1.7 },
      uOffset: { value: 0.035 },
      uOpacity: { value: 0.65 },
      uPixelRatio: { value: dpr },
      uColorA: { value: new THREE.Color('#FFC6CA') },
      uColorB: { value: new THREE.Color('#FFBF00') },
    }),
    [dpr],
  );

  const ref = useRef();

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const u = uniforms;
    const scroll = scrollRef?.current ?? 0;

    u.uTime.value = t;
    u.uBreath.value = Math.sin((t / 5.5) * Math.PI * 2) * 0.035;
    u.uAmp.value = THREE.MathUtils.damp(u.uAmp.value, 0.26, 1.1, delta);
    u.uWarp.value = THREE.MathUtils.damp(u.uWarp.value, 0.1 + scroll * 0.34, 3, delta);
    u.uFreq.value = THREE.MathUtils.damp(u.uFreq.value, 1.55 + scroll * 1.5, 3, delta);
    // the shell peels away from the surface as you scroll
    u.uOffset.value = THREE.MathUtils.damp(u.uOffset.value, 0.035 + scroll * 0.5, 3, delta);

    if (ref.current) {
      ref.current.rotation.y = t * 0.075;
      ref.current.rotation.z = Math.sin(t * 0.12) * 0.12;
    }
  });

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
