import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uSpeed;
uniform float uArc;
uniform float uIntensity;
varying vec2 vUv;

void main(){
  // a comet-like arc chasing around the ring
  float head = fract(uTime * uSpeed);
  float d = fract(vUv.x - head);
  float trail = pow(1.0 - smoothstep(0.0, uArc, d), 2.4);
  float base = 0.16;
  float a = (base + trail) * uIntensity;
  gl_FragColor = vec4(uColor * (0.6 + trail * 1.8), a);
  #include <colorspace_fragment>
}
`;

function Ring({ radius, tube, color, speed, arc, intensity, rotation, tilt }) {
  const ref = useRef();
  const uniforms = useMemo(
    () => ({
      uTime: { value: Math.random() * 30 },
      uColor: { value: new THREE.Color(color) },
      uSpeed: { value: speed },
      uArc: { value: arc },
      uIntensity: { value: intensity },
    }),
    [color, speed, arc, intensity],
  );

  useFrame((state, delta) => {
    uniforms.uTime.value += delta;
    if (ref.current) {
      ref.current.rotation.z += delta * tilt;
    }
  });

  return (
    <mesh ref={ref} rotation={rotation}>
      <torusGeometry args={[radius, tube, 3, 320]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function Rings({ scrollRef }) {
  const group = useRef();

  useFrame((state, delta) => {
    if (!group.current) return;
    const s = scrollRef?.current ?? 0;
    group.current.rotation.y += delta * 0.06;
    const target = 1 - s * 0.22;
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, target, 3, delta));
  });

  return (
    <group ref={group}>
      <Ring
        radius={2.05}
        tube={0.008}
        color="#1CC5B3"
        speed={0.09}
        arc={0.42}
        intensity={1.2}
        rotation={[Math.PI / 2.6, 0.35, 0.55]}
        tilt={0.05}
      />
      <Ring
        radius={2.6}
        tube={0.007}
        color="#A06EFF"
        speed={-0.06}
        arc={0.3}
        intensity={1.0}
        rotation={[Math.PI / 1.45, 0.9, -0.7]}
        tilt={-0.03}
      />
      <Ring
        radius={3.35}
        tube={0.006}
        color="#7B7CFF"
        speed={0.04}
        arc={0.22}
        intensity={0.75}
        rotation={[Math.PI / 3.4, -0.8, 1.15]}
        tilt={0.02}
      />
    </group>
  );
}
