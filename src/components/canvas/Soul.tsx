"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { sampleFigure, seeded, standing } from "@/lib/figure";
import { smoothDamp } from "@/lib/spring";
import { useStore } from "@/lib/store";
import { figureHeight, lightColour } from "@/motion/director";
import { soul } from "@/motion/timeline";

const vertex = /* glsl */ `
  uniform float uGather;      // 0 = scattered dust, 1 = the figure
  uniform float uStagger;
  uniform vec3 uOrigin;       // centre of the figure in the world
  uniform float uRise;        // upward speed, world units per second
  uniform float uTrail;
  uniform float uTime;
  uniform vec3 uCursor;       // cursor position in the world
  uniform float uCursorOn;
  uniform float uCursorRadius;
  uniform float uCursorPush;
  uniform float uPixelRatio;
  uniform float uHeight;

  attribute vec3 aScatter;
  attribute vec4 aSeed;       // four independent random values per particle

  varying float vAlpha;
  varying float vWarm;

  mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

  void main() {
    // Each particle sets off at its own moment and eases to rest.
    float t = clamp((uGather - aSeed.x * uStagger) / (1.0 - uStagger), 0.0, 1.0);
    float e = 1.0 - pow(1.0 - t, 3.0);

    // In flight: a wide, slow swirl around the figure, like dust in water.
    vec3 from = aScatter;
    float swirl = (1.0 - e) * (1.6 + aSeed.y * 2.4) * (aSeed.z > 0.5 ? 1.0 : -1.0);
    from.xz = rot(swirl) * from.xz;
    from.y += sin(uTime * 0.3 + aSeed.w * 6.283) * 0.4 * (1.0 - e);

    // At rest: the figure, with a faint breathing shimmer.
    vec3 body = position;
    float breathe = sin(uTime * 0.8 + aSeed.w * 6.283);
    body += normalize(position + vec3(0.0001)) * breathe * 0.006;
    body.xz += vec2(sin(uTime * 0.6 + aSeed.y * 40.0), cos(uTime * 0.5 + aSeed.z * 40.0)) * 0.004;

    vec3 p = mix(from, body, e) + uOrigin;

    // Rising: particles trail behind by their own amount, drawing streaks of light.
    float lag = aSeed.y * aSeed.y * uTrail;
    p.y -= uRise * lag * e;
    p.xz *= 1.0 - clamp(abs(uRise) * lag * 0.02, 0.0, 0.35) * e;

    // The cursor parts the particles gently.
    vec3 away = p - uCursor;
    float d = length(away.xy);
    float push = smoothstep(uCursorRadius, 0.0, d);
    push = push * push * uCursorOn * e;
    p.xy += normalize(away.xy + vec2(0.0001)) * push * uCursorPush;
    p.z += push * (aSeed.z - 0.5) * 0.25;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = max(-mv.z, 0.001);

    float size = mix(0.012, 0.03, aSeed.w) * (1.0 + (1.0 - e) * 1.6);
    gl_PointSize = clamp(size * uHeight * uPixelRatio / dist, 0.0, 26.0 * uPixelRatio);

    float twinkle = 0.7 + 0.3 * sin(uTime * (1.0 + aSeed.x * 2.0) + aSeed.z * 80.0);
    float near = smoothstep(0.15, 1.4, dist);
    vAlpha = mix(0.5, 1.0, e) * twinkle * near * smoothstep(0.0, 0.12, uGather + 0.02);
    vWarm = aSeed.x;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColour;
  uniform float uOpacity;
  uniform float uFade;
  varying float vAlpha;
  varying float vWarm;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float soft = smoothstep(0.5, 0.05, d);
    vec3 colour = mix(uColour, vec3(1.0), 0.25 + 0.45 * vWarm);
    gl_FragColor = vec4(colour, soft * vAlpha * uOpacity * uFade);
  }
`;

/**
 * The soul. Particles gather from every edge of the screen into a standing
 * figure of light, then rise with it through the dark.
 */
export function Soul({ count }: { count: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const motion = useRef<{
    start: number | null;
    lastY: number;
    rise: { v: number };
    riseNow: number;
    cursorOn: { v: number };
    cursorNow: number;
    ray: THREE.Raycaster;
    plane: THREE.Plane;
    hit: THREE.Vector3;
    ndc: THREE.Vector2;
    normal: THREE.Vector3;
  }>(null);

  const geometry = useMemo(() => {
    const rand = seeded(20261112);
    const g = new THREE.BufferGeometry();
    const body = sampleFigure(standing, count, rand);
    const scatter = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      // Start beyond the edges of the frame, all around the figure.
      const angle = rand() * Math.PI * 2;
      const radius = 9 + rand() * 12;
      scatter[i * 3] = Math.cos(angle) * radius * 1.35;
      scatter[i * 3 + 1] = Math.sin(angle) * radius * 0.8;
      scatter[i * 3 + 2] = (rand() - 0.5) * 14;
      seeds[i * 4] = rand();
      seeds[i * 4 + 1] = rand();
      seeds[i * 4 + 2] = rand();
      seeds[i * 4 + 3] = rand();
    }
    g.setAttribute("position", new THREE.BufferAttribute(body, 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uGather: { value: 0 },
      uStagger: { value: soul.gatherStagger },
      uOrigin: { value: new THREE.Vector3() },
      uRise: { value: 0 },
      uTrail: { value: soul.trail },
      uTime: { value: 0 },
      uCursor: { value: new THREE.Vector3(999, 999, 0) },
      uCursorOn: { value: 0 },
      uCursorRadius: { value: soul.cursorRadius },
      uCursorPush: { value: soul.cursorPush },
      uPixelRatio: { value: 1 },
      uHeight: { value: 800 },
      uColour: { value: new THREE.Color() },
      uFade: { value: 1 },
      // Fewer particles each carry a little more light, so every tier reads alike.
      uOpacity: { value: Math.min(0.9, 0.2 * Math.sqrt(70000 / count)) },
    }),
    [count],
  );

  useFrame((state, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;
    const m = (motion.current ??= {
      start: null,
      lastY: 0,
      rise: { v: 0 },
      riseNow: 0,
      cursorOn: { v: 0 },
      cursorNow: 0,
      ray: new THREE.Raycaster(),
      plane: new THREE.Plane(),
      hit: new THREE.Vector3(),
      ndc: new THREE.Vector2(),
      normal: new THREE.Vector3(),
    });
    const dt = Math.min(delta, 1 / 20);
    const { progress, entered, reducedMotion, pointer, pointerActive } =
      useStore.getState();
    const now = state.clock.elapsedTime;

    // Gathering plays on its own clock once the loader hands over.
    if (entered && m.start === null) m.start = now;
    const gather =
      m.start === null ? 0 : Math.min(1, (now - m.start) / soul.gatherSeconds);
    // If the visitor scrolls on before it finishes, the figure completes at once.
    u.uGather.value =
      reducedMotion || progress > 0.06
        ? Math.max(gather, entered ? 1 : 0)
        : gather;

    const y = figureHeight(progress);
    u.uOrigin.value.set(0, y, 0);
    const speed = (y - m.lastY) / Math.max(dt, 1e-4);
    m.lastY = y;
    m.riseNow = reducedMotion
      ? 0
      : smoothDamp(m.riseNow, speed, m.rise, 0.25, dt);
    u.uRise.value = m.riseNow;

    // Where the cursor meets the plane the figure stands in, facing the camera.
    state.camera.getWorldDirection(m.normal);
    m.plane.setFromNormalAndCoplanarPoint(m.normal, u.uOrigin.value);
    m.ray.setFromCamera(m.ndc.set(pointer.x, pointer.y), state.camera);
    if (m.ray.ray.intersectPlane(m.plane, m.hit)) u.uCursor.value.copy(m.hit);
    // The soul is whole until the camera passes into the mind (phase 3 takes over there).
    const present = 1 - THREE.MathUtils.smoothstep(progress, 0.37, 0.43);
    u.uFade.value = present;
    m.cursorNow = smoothDamp(
      m.cursorNow,
      pointerActive && !reducedMotion && progress < 0.34 ? 1 : 0,
      m.cursorOn,
      0.4,
      dt,
    );
    u.uCursorOn.value = m.cursorNow;

    u.uTime.value = reducedMotion ? 0 : now;
    u.uPixelRatio.value = state.gl.getPixelRatio();
    u.uHeight.value = state.size.height;
    lightColour(progress, u.uColour.value);
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={2}>
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
