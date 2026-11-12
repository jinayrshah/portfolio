"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { loadImage, sampleImage, seeded } from "@/lib/soulImage";
import { smoothDamp } from "@/lib/spring";
import { useStore } from "@/lib/store";
import { figureHeight, figureNow, figureOffsetX } from "@/motion/director";
import { soul } from "@/motion/timeline";

const WIDTH = soul.height * soul.aspect;
const HEIGHT = soul.height;

/* ---------- The particles: they gather into the figure and trail as it rises ---------- */

const pointsVertex = /* glsl */ `
  uniform float uGather;      // 0 = scattered dust, 1 = the figure
  uniform float uStagger;
  uniform float uRise;        // upward speed, world units per second
  uniform float uTrail;
  uniform float uTime;
  uniform vec2 uCursor;       // cursor position, relative to the heart
  uniform float uCursorOn;
  uniform float uCursorRadius;
  uniform float uCursorPush;
  uniform float uPixelRatio;
  uniform float uHeight;
  uniform float uRest;        // how bright the points stay once the picture is whole

  attribute vec3 aScatter;
  attribute vec3 aColour;
  attribute vec4 aSeed;       // four independent random values per particle

  varying float vAlpha;
  varying vec3 vColour;

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

    // At rest: the figure, drifting a little, as smoke does.
    vec3 body = position;
    float away = length(position.xy);
    body.xy += vec2(sin(uTime * 0.5 + aSeed.y * 40.0), cos(uTime * 0.4 + aSeed.z * 40.0)) * 0.012 * (0.3 + away);

    vec3 p = mix(from, body, e);

    // Rising: particles trail behind by their own amount, drawing streaks of light.
    float lag = aSeed.y * aSeed.y * uTrail;
    p.y -= uRise * lag * e;
    p.x *= 1.0 - clamp(abs(uRise) * lag * 0.02, 0.0, 0.35) * e;

    // The cursor parts the particles gently.
    vec2 off = p.xy - uCursor;
    float push = smoothstep(uCursorRadius, 0.0, length(off));
    push = push * push * uCursorOn * e;
    p.xy += normalize(off + vec2(0.0001)) * push * uCursorPush;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = max(-mv.z, 0.001);

    float size = mix(0.012, 0.03, aSeed.w) * (1.0 + (1.0 - e) * 1.6);
    gl_PointSize = clamp(size * uHeight * uPixelRatio / dist, 0.0, 26.0 * uPixelRatio);

    float twinkle = 0.65 + 0.35 * sin(uTime * (1.0 + aSeed.x * 2.0) + aSeed.z * 80.0);
    float near = smoothstep(0.15, 1.4, dist);
    // Once the picture is whole the points dim to a shimmer; rising wakes them again.
    float settled = smoothstep(0.75, 1.0, uGather);
    float rest = mix(1.0, clamp(uRest + abs(uRise) * 0.12, 0.0, 1.0), settled);
    vAlpha = mix(0.5, 1.0, e) * twinkle * near * rest * smoothstep(0.0, 0.12, uGather + 0.02);
    vColour = aColour;
  }
`;

const pointsFragment = /* glsl */ `
  uniform float uOpacity;
  uniform float uFade;
  varying float vAlpha;
  varying vec3 vColour;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float soft = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(vColour, soft * vAlpha * uOpacity * uFade);
  }
`;

/* ---------- The picture: revealed from the heart outwards, and kept alive ---------- */

const pictureVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const pictureFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uReveal;      // 0 = hidden, 1 = whole
  uniform float uFade;
  uniform float uTime;
  uniform float uRise;
  uniform vec2 uHeart;        // where the heart is in the picture, 0..1
  uniform vec2 uSize;         // picture size in world units
  uniform vec2 uCursor;       // cursor position, relative to the heart
  uniform float uCursorOn;
  uniform float uCursorRadius;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  void main() {
    vec2 world = (vUv - uHeart) * uSize;   // position relative to the heart
    float r = length(world);
    float below = max(0.0, -world.y);

    // The smoke drifts: barely at the heart and face, more in the trailing veils.
    vec2 q = world * 1.6;
    float t = uTime * 0.14;
    vec2 drift = vec2(noise(q + vec2(0.0, t)) - 0.5, noise(q + vec2(5.2, -t)) - 0.5);
    vec2 uv = vUv + drift * smoothstep(0.25, 2.6, r) * 0.022;
    uv.x += sin(uTime * 0.35 + world.y * 1.7) * 0.0035 * below;

    // Rising draws the veils out behind the figure.
    float stretch = clamp(uRise * 0.012, -0.25, 0.25);
    uv.y += below / uSize.y * stretch;

    // The cursor parts the smoke.
    vec2 off = world - uCursor;
    float push = smoothstep(uCursorRadius * 1.6, 0.0, length(off));
    uv -= normalize(off + vec2(0.0001)) * push * push * uCursorOn * 0.014;

    vec3 colour = max(texture2D(uMap, uv).rgb - 0.012, 0.0);

    // Revealed from the heart outwards, with a soft uneven edge.
    float n = noise(world * 2.4 + 7.0);
    float shown = smoothstep(0.0, 0.35, uReveal * 1.75 - r / 3.2 - n * 0.25);

    // The heart breathes.
    float pulse = 0.5 + 0.5 * sin(uTime * 0.9);
    colour *= 1.0 + exp(-r * r * 3.0) * pulse * 0.22;

    float edge = smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x) * smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.96, uv.y);
    gl_FragColor = vec4(colour * shown * edge * uFade, 1.0);
  }
`;

type Built = { geometry: THREE.BufferGeometry; texture: THREE.Texture };

function build(img: HTMLImageElement, count: number): Built {
  const rand = seeded(20261112);
  const { positions, colours } = sampleImage(img, count, rand, {
    width: WIDTH,
    height: HEIGHT,
    heart: soul.heart,
  });
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
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColour", new THREE.BufferAttribute(colours, 3));
  geometry.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));

  const texture = new THREE.Texture(img);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return { geometry, texture };
}

/**
 * The soul. Dust gathers from every edge of the screen into a figure of smoke
 * and light, which then breathes, answers the cursor and rises through the dark.
 * The figure always faces the camera and is placed by its heart.
 */
export function Soul({ count }: { count: number }) {
  const group = useRef<THREE.Group>(null);
  const points = useRef<THREE.ShaderMaterial>(null);
  const picture = useRef<THREE.ShaderMaterial>(null);
  const [built, setBuilt] = useState<Built | null>(null);
  const motion = useRef<{
    start: number | null;
    lastY: number;
    follow: { v: number };
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

  useEffect(() => {
    let alive = true;
    let made: Built | null = null;
    loadImage(soul.image)
      .then((img) => {
        if (!alive) return;
        made = build(img, count);
        setBuilt(made);
      })
      .catch(() => {
        // Without the picture the guide light alone carries the scene.
      });
    return () => {
      alive = false;
      made?.geometry.dispose();
      made?.texture.dispose();
    };
  }, [count]);

  const pointsUniforms = useMemo(
    () => ({
      uGather: { value: 0 },
      uStagger: { value: soul.gatherStagger },
      uRise: { value: 0 },
      uTrail: { value: soul.trail },
      uTime: { value: 0 },
      uCursor: { value: new THREE.Vector2(999, 999) },
      uCursorOn: { value: 0 },
      uCursorRadius: { value: soul.cursorRadius },
      uCursorPush: { value: soul.cursorPush },
      uPixelRatio: { value: 1 },
      uHeight: { value: 800 },
      uRest: { value: soul.restShimmer },
      uFade: { value: 1 },
      // Fewer particles each carry a little more light, so every tier reads alike.
      uOpacity: { value: Math.min(0.9, 0.2 * Math.sqrt(70000 / count)) },
    }),
    [count],
  );

  const pictureUniforms = useMemo(
    () => ({
      uMap: { value: null as THREE.Texture | null },
      uReveal: { value: 0 },
      uFade: { value: 1 },
      uTime: { value: 0 },
      uRise: { value: 0 },
      uHeart: { value: new THREE.Vector2(soul.heart[0], soul.heart[1]) },
      uSize: { value: new THREE.Vector2(WIDTH, HEIGHT) },
      uCursor: { value: new THREE.Vector2(999, 999) },
      uCursorOn: { value: 0 },
      uCursorRadius: { value: soul.cursorRadius },
    }),
    [],
  );

  useFrame((state, delta) => {
    const g = group.current;
    const u = points.current?.uniforms;
    const pu = picture.current?.uniforms;
    if (!g || !u || !pu || !built) return;
    const m = (motion.current ??= {
      start: null,
      lastY: 0,
      follow: { v: 0 },
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
    pu.uMap.value = built.texture;

    // Gathering plays on its own clock once the loader hands over.
    if (entered && m.start === null) m.start = now;
    const gather =
      m.start === null ? 0 : Math.min(1, (now - m.start) / soul.gatherSeconds);
    // If the visitor scrolls on before it finishes, the figure completes at once.
    const gathered =
      reducedMotion || progress > 0.06
        ? Math.max(gather, entered ? 1 : 0)
        : gather;
    u.uGather.value = gathered;
    pu.uReveal.value = THREE.MathUtils.smoothstep(gathered, 0.4, 1);

    // The heart is the anchor; the figure turns to face the camera.
    const goal = figureHeight(progress);
    figureNow.y =
      reducedMotion || !figureNow.ready
        ? goal
        : smoothDamp(figureNow.y, goal, m.follow, soul.followSmoothTime, dt);
    figureNow.ready = true;
    const y = figureNow.y;
    g.position.set(
      figureOffsetX(progress, state.size.width / state.size.height),
      y + soul.heartLift,
      0,
    );
    g.quaternion.copy(state.camera.quaternion);
    g.updateMatrixWorld();

    const speed = (y - m.lastY) / Math.max(dt, 1e-4);
    m.lastY = y;
    m.riseNow = reducedMotion
      ? 0
      : smoothDamp(m.riseNow, speed, m.rise, 0.25, dt);
    u.uRise.value = m.riseNow;
    pu.uRise.value = m.riseNow;

    // Where the cursor meets the plane the figure stands in.
    state.camera.getWorldDirection(m.normal);
    m.plane.setFromNormalAndCoplanarPoint(m.normal, g.position);
    m.ray.setFromCamera(m.ndc.set(pointer.x, pointer.y), state.camera);
    if (m.ray.ray.intersectPlane(m.plane, m.hit)) {
      g.worldToLocal(m.hit);
      u.uCursor.value.set(m.hit.x, m.hit.y);
      pu.uCursor.value.set(m.hit.x, m.hit.y);
    }
    // The soul is whole until the camera passes into its heart.
    const present = 1 - THREE.MathUtils.smoothstep(progress, 0.37, 0.43);
    u.uFade.value = present;
    pu.uFade.value = present;
    m.cursorNow = smoothDamp(
      m.cursorNow,
      pointerActive && !reducedMotion && progress < 0.34 ? 1 : 0,
      m.cursorOn,
      0.4,
      dt,
    );
    u.uCursorOn.value = m.cursorNow;
    pu.uCursorOn.value = m.cursorNow;

    const time = reducedMotion ? 0 : now;
    u.uTime.value = time;
    pu.uTime.value = time;
    u.uPixelRatio.value = state.gl.getPixelRatio();
    u.uHeight.value = state.size.height;
  });

  if (!built) return null;

  return (
    <group ref={group}>
      <mesh
        frustumCulled={false}
        renderOrder={2}
        position={[
          (0.5 - soul.heart[0]) * WIDTH,
          (0.5 - soul.heart[1]) * HEIGHT,
          0,
        ]}
      >
        <planeGeometry args={[WIDTH, HEIGHT]} />
        <shaderMaterial
          ref={picture}
          vertexShader={pictureVertex}
          fragmentShader={pictureFragment}
          uniforms={pictureUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <points geometry={built.geometry} frustumCulled={false} renderOrder={3}>
        <shaderMaterial
          ref={points}
          vertexShader={pointsVertex}
          fragmentShader={pointsFragment}
          uniforms={pointsUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
