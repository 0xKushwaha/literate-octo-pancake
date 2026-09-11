import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { simplex3d } from './glsl';

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform float uBreath;
uniform float uWarp;

varying vec3 vNormalW;
varying vec3 vViewDir;
varying float vDisp;
varying vec3 vLocal;

${simplex3d}

vec3 ortho(vec3 v){
  return abs(v.x) > abs(v.z)
    ? normalize(vec3(-v.y, v.x, 0.0))
    : normalize(vec3(0.0, -v.z, v.y));
}

// signed displacement for a point on the unit sphere
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
  vec3 displaced = n * (1.0 + d);

  // recompute normals by sampling two tangent neighbours
  float eps = 0.035;
  vec3 T = ortho(n);
  vec3 B = normalize(cross(n, T));
  vec3 nA = normalize(n + T * eps);
  vec3 nB = normalize(n + B * eps);
  vec3 pA = nA * (1.0 + displace(nA));
  vec3 pB = nB * (1.0 + displace(nB));
  vec3 newNormal = normalize(cross(pA - displaced, pB - displaced));
  if (dot(newNormal, n) < 0.0) newNormal = -newNormal;

  vec4 world = modelMatrix * vec4(displaced, 1.0);

  vDisp = d;
  vLocal = displaced;
  vNormalW = normalize(mat3(modelMatrix) * newNormal);
  vViewDir = normalize(cameraPosition - world.xyz);

  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uAqua;
uniform vec3 uIris;
uniform vec3 uCore;
uniform float uOpacity;

varying vec3 vNormalW;
varying vec3 vViewDir;
varying float vDisp;
varying vec3 vLocal;

void main(){
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewDir);

  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 3.0);

  // studio key + fill: the body is a saturated jewel, not a silhouette
  vec3 L1 = normalize(vec3(-0.45, 0.85, 0.75));
  vec3 L2 = normalize(vec3(0.8, -0.25, 0.4));
  float key  = pow(max(dot(N, L1), 0.0), 1.35);
  float fill = pow(max(dot(N, L2), 0.0), 2.1);

  vec3 H = normalize(L1 + V);
  float spec = pow(max(dot(N, H), 0.0), 120.0);

  // valleys of the noise field stay in shadow, ridges catch the key
  float crease = smoothstep(-0.02, -0.16, vDisp);

  vec3 col = mix(uDeep * 0.55, uDeep, smoothstep(0.0, 0.7, key + fill));
  col += uAqua * key  * 0.72;
  col += uIris * fill * 0.55;
  col -= uDeep * crease * 0.45;

  // iridescent rim, kept restrained so it reads as sheen not glow
  float shift = sin(vLocal.y * 2.4 + vLocal.x * 1.2 + uTime * 0.42) * 0.5 + 0.5;
  vec3 rim = mix(uAqua, uIris, shift);
  col += rim * fres * 0.56;

  col += uCore * spec * 0.22;

  // grounded underside so the form sits on the page instead of floating
  float ground = smoothstep(-1.15, 0.35, vLocal.y);
  col *= mix(0.5, 1.0, ground);

  gl_FragColor = vec4(col, uOpacity);

  #include <colorspace_fragment>
}
`;

export default function Orb({ detail = 48, scrollRef, quality = 1 }) {
  const mesh = useRef();
  const mat = useRef();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.04 },
      uFreq: { value: 1.55 },
      uBreath: { value: 0 },
      uWarp: { value: 0.10 },
      uOpacity: { value: 1 },
      uDeep: { value: new THREE.Color('#F9DCC0') },
      uAqua: { value: new THREE.Color('#FFB0B5') },
      uIris: { value: new THREE.Color('#FFBF00') },
      uCore: { value: new THREE.Color('#ffffff') },
    }),
    [],
  );

  const geometry = useMemo(
    () => new THREE.IcosahedronGeometry(1, Math.round(detail * quality)),
    [detail, quality],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const u = uniforms;
    u.uTime.value = t;

    // 5.5s breathing cycle — paced like a guided exhale
    const breath = Math.sin((t / 5.5) * Math.PI * 2);
    u.uBreath.value = breath * 0.045;

    // ease amplitude in on mount so it "wakes up"
    

    // ease the amplitude in on mount so the form "wakes up"
    u.uAmp.value = THREE.MathUtils.damp(u.uAmp.value, 0.26, 1.1, delta);

    const scroll = scrollRef?.current ?? 0;
    u.uWarp.value = THREE.MathUtils.damp(u.uWarp.value, 0.10 + scroll * 0.34, 3, delta);
    u.uFreq.value = THREE.MathUtils.damp(u.uFreq.value, 1.55 + scroll * 1.5, 3, delta);

    if (mesh.current) {
      mesh.current.rotation.y = t * 0.085;
      mesh.current.rotation.z = Math.sin(t * 0.12) * 0.12;
    }
  });

  return (
    <mesh ref={mesh} geometry={geometry}>
      <shaderMaterial
        ref={mat}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={false}
      />
    </mesh>
  );
}
