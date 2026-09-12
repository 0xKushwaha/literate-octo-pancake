import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  DirectionalLight,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { NOISE_GLSL } from './noise.glsl';
import { useBrandColors } from './useBrandColors';

/**
 * The hero form.
 *
 * What it is: a sphere whose surface is pushed in and out by three octaves of
 * simplex noise, drifting slowly, with the whole displacement field swelling
 * and settling on a fifteen second cycle. What it should read as: something
 * breathing. Not a planet, not a blob of mercury, not a technology demo.
 *
 * Why plain three.js and not react-three-fiber. R3F is a React reconciler for
 * a scene graph, and this scene is one mesh, three lights and a camera —
 * nothing it reconciles ever changes shape. It also caps React at below 19.3
 * in its peer range, on a project that floats ^19.2.8, and it declares Expo
 * and React Native as optional peers that npm then has to reason about. That
 * is a lot of dependency surface to take on for a single object, on a codebase
 * that already deleted an animation library for weighing 45 KB. three.js on
 * its own has no peer dependencies at all.
 *
 * Why a displaced mesh rather than a raymarched shader: this has to be good on
 * a phone. A displaced mesh is vertex-bound and we control the vertex count
 * exactly; a full-screen raymarch is fill-bound, which is the expensive axis
 * on mobile GPUs. Twenty thousand triangles is nothing for a desktop card and
 * we drop to five thousand on the reduced tier.
 *
 * Why no environment map: the CSP allows connections to this origin and to
 * Supabase, and nothing else. Every "just drop in an HDRI" recipe fetches from
 * a CDN and would be blocked with no visible error. So the form is lit by
 * three real lights and nothing else, which also suits a palette that decided
 * against gradients: what you get is light falling on a matte surface, not a
 * decorative wash.
 */

const DETAIL = { full: 5, reduced: 4 };

export default function LumenForm({ tier = 'full', maxDpr = 2, active = true, onError }) {
  const host = useRef(null);
  const api = useRef(null);
  const palette = useBrandColors();

  // Everything GPU-side is built once per tier. Tier only changes when the
  // viewport crosses a breakpoint or the OS motion setting flips, which is
  // rare and worth a rebuild rather than a branch on every frame.
  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;

    let renderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch (err) {
      // A context can be refused even when the capability probe said yes:
      // too many live contexts, a driver that gave up, a laptop switching
      // GPUs. The hero shows the photograph instead.
      console.warn('[lumen] could not create a WebGL context', err);
      onError?.();
      return undefined;
    }

    const width = el.clientWidth || 1;
    const height = el.clientHeight || 1;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(width, height, false);
    renderer.setClearAlpha(0);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    el.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(30, width / height, 0.1, 100);
    // Close enough that the form fills about 85% of the frame height. Further
    // back and it reads as an object placed in an empty card rather than as
    // the subject of it.
    camera.position.set(0, 0, 5.5);

    // Intensities look high next to the usual three.js examples, and they are
    // meant to. MeshStandardMaterial uses a physically based diffuse term, so
    // reflected light is albedo/pi: to see a surface at roughly its own colour
    // the irradiance landing on it has to be around pi, not around one. At the
    // intensities that looked reasonable on paper the form rendered as grey
    // stone.
    const ambient = new AmbientLight(0xffffff, 2.0);
    // One key light, white, high and to the right — the same direction the
    // shadow under every card on this site already falls from.
    const key = new DirectionalLight(0xffffff, 2.2);
    key.position.set(2.2, 2.8, 2.4);
    // The only warm thing in the scene: amber, from behind and below, catching
    // one edge. Low enough to read as light rather than as a second colour.
    const rim = new DirectionalLight(0xffbf00, 0.9);
    rim.position.set(-2.6, -1.4, -1.2);
    scene.add(ambient, key, rim);

    const uniforms = {
      uTime: { value: 0 },
      // How far the surface travels, as a fraction of the radius. Past about
      // 0.3 the lobes pinch into spikes and it stops looking calm.
      uAmp: { value: 0.27 },
      // Low frequency on purpose: four or five broad lobes across the whole
      // form. At 1.0 the silhouette granulated and the thing read as a rock.
      uFreq: { value: 0.72 },
    };

    const geometry = new IcosahedronGeometry(1, DETAIL[tier] ?? 4);
    // Matte, but not perfectly matte: a little specular is what separates
    // glazed ceramic from felt, and it is the only thing giving the lobes an
    // edge to catch light on.
    const material = new MeshStandardMaterial({ roughness: 0.8, metalness: 0 });

    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          /* glsl */ `#include <common>
          uniform float uTime;
          uniform float uAmp;
          uniform float uFreq;
          ${NOISE_GLSL}

          float lm_field(vec3 p) {
            float t = uTime;
            // Three octaves, but the upper two are quiet. They are there to
            // keep the surface from looking mathematically smooth, not to add
            // detail you could count.
            float f  = lm_snoise(p * uFreq + vec3(0.0, 0.0, t * 0.13));
            f += 0.34 * lm_snoise(p * uFreq * 1.93 + vec3(t * 0.11, 0.0, 0.0));
            f += 0.11 * lm_snoise(p * uFreq * 3.70 - vec3(0.0, t * 0.09, 0.0));
            return f * 0.690;
          }

          vec3 lm_displace(vec3 p) {
            // The swell. Without it the surface ripples but the body never
            // moves, which reads as water rather than as breath.
            float breath = 0.5 + 0.5 * sin(uTime * 0.42);
            float amp = uAmp * (0.80 + 0.20 * breath);
            return p + normalize(p) * lm_field(p) * amp;
          }
        `,
        )
        // Normals have to be rebuilt, or the lighting describes the sphere we
        // started with rather than the shape we made. Two neighbours a small
        // step away along the surface, displaced the same way, give the plane
        // the true normal is perpendicular to.
        .replace(
          '#include <beginnormal_vertex>',
          /* glsl */ `
          vec3 lmN = normalize(position);
          vec3 lmAxis = abs(lmN.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
          vec3 lmT = normalize(cross(lmN, lmAxis));
          vec3 lmB = normalize(cross(lmN, lmT));
          const float lmEps = 0.075;
          vec3 lmD0 = lm_displace(position);
          vec3 lmD1 = lm_displace(normalize(position + lmT * lmEps));
          vec3 lmD2 = lm_displace(normalize(position + lmB * lmEps));
          vec3 objectNormal = normalize(cross(lmD1 - lmD0, lmD2 - lmD0));
        `,
        )
        .replace('#include <begin_vertex>', /* glsl */ ' vec3 transformed = lmD0; ');
    };
    // Every instance compiles the same program, so hand three a stable key
    // instead of letting it hash the function source.
    material.customProgramCacheKey = () => 'lumen-organic-form';

    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    /* ---------------------------------------------------------- the loop */

    const timeScale = tier === 'full' ? 1 : 0.75;
    const tilt = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let drift = 0;
    let raf = 0;
    let running = false;
    let last = 0;

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      uniforms.uTime.value += dt * timeScale;
      drift += dt * 0.05;
      tilt.x += (target.x - tilt.x) * 0.04;
      tilt.y += (target.y - tilt.y) * 0.04;

      mesh.rotation.x = tilt.x;
      mesh.rotation.y = drift + tilt.y;
      mesh.scale.setScalar(1 + Math.sin(uniforms.uTime.value * 0.42) * 0.015);

      renderer.render(scene, camera);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    /* ------------------------------------------------------ the listeners */

    // Pointer response is a desktop affordance. A touch screen has no cursor
    // to answer, and tracking taps would make the form twitch on every scroll.
    const onPointer = (e) => {
      target.y = ((e.clientX / window.innerWidth) * 2 - 1) * 0.24;
      target.x = ((e.clientY / window.innerHeight) * 2 - 1) * 0.16;
    };
    if (tier === 'full') window.addEventListener('pointermove', onPointer, { passive: true });

    const resize = new ResizeObserver(([entry]) => {
      const w = Math.max(1, Math.round(entry.contentRect.width));
      const h = Math.max(1, Math.round(entry.contentRect.height));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!running) renderer.render(scene, camera);
    });
    resize.observe(el);

    const onLost = (e) => {
      e.preventDefault();
      stop();
      console.warn('[lumen] WebGL context lost, falling back to the photograph');
      onError?.();
    };
    renderer.domElement.addEventListener('webglcontextlost', onLost);

    // One frame immediately, so the form is on screen even if it mounts paused.
    renderer.render(scene, camera);

    api.current = {
      start,
      stop,
      setColor: (css) => { material.color.set(css); if (!running) renderer.render(scene, camera); },
      setRim: (css) => { rim.color.set(css); if (!running) renderer.render(scene, camera); },
      setAmbient: (css) => { ambient.color.set(css); if (!running) renderer.render(scene, camera); },
    };

    return () => {
      api.current = null;
      stop();
      resize.disconnect();
      if (tier === 'full') window.removeEventListener('pointermove', onPointer);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      // Nothing reclaims a GPU context on its own, and browsers cap how many
      // a page may hold.
      renderer.forceContextLoss?.();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [tier, maxDpr, onError]);

  // Off screen means no work at all, not a cheaper frame.
  useEffect(() => {
    if (!api.current) return;
    if (active) api.current.start();
    else api.current.stop();
  }, [active]);

  useEffect(() => {
    if (!api.current || !palette) return;
    api.current.setColor(palette.form);
    api.current.setRim(palette.rim);
    api.current.setAmbient(palette.ground);
  }, [palette]);

  return <div ref={host} aria-hidden="true" style={{ position: 'absolute', inset: 0 }} />;
}
