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

/**
 * Ripples: each press or drag on the soul starts a wave that travels out
 * across the figure and dies away, with a springy pull near the cursor.
 * Particles and picture share this, so they move as one body.
 */
const ripple = /* glsl */ `
  uniform vec4 uWave[6];      // x, y (relative to the heart), start time, strength
  uniform vec2 uWaveDir[6];   // direction of the drag that made it
  uniform float uNow;
  vec2 ripple(vec2 p) {
    vec2 d = vec2(0.0);
    for (int i = 0; i < 6; i++) {
      float age = uNow - uWave[i].z;
      if (age < 0.0 || age > 5.0) continue;
      vec2 off = p - uWave[i].xy;
      float dist = length(off);
      vec2 radial = off / (dist + 0.001);
      // A slow ring travels outwards, lifting the surface as it passes.
      float front = age * 1.15;
      float ring = exp(-pow((dist - front) / 0.6, 2.0)) * exp(-age * 0.7);
      // Near the cursor the body is pulled along the drag, then swings back like jelly.
      float pull = exp(-dist * dist / 0.9) * exp(-age * 1.7) * cos(age * 7.0);
      d += uWave[i].w * (radial * ring * 0.42 * cos((dist - front) * 3.5) + uWaveDir[i] * pull * 0.6);
    }
    return d;
  }
`;

/* ---------- The particles: they gather into the figure and trail as it rises ---------- */

const pointsVertex = /* glsl */ `
  ${ripple}
  uniform vec3 uStage;        // progress of the three changes of form
  uniform float uFlow;
  attribute vec3 aPos1;
  attribute vec3 aPos2;
  attribute vec3 aCol1;
  attribute vec3 aCol2;
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
    // Each particle leaves for the next form at its own moment, on a curved path
    // around the heart, so the matter of one form visibly becomes the next.
    float a1 = smoothstep(0.0, 1.0, clamp(uStage.x * 1.5 - aSeed.z * 0.5, 0.0, 1.0));
    float a2 = smoothstep(0.0, 1.0, clamp(uStage.y * 1.5 - aSeed.x * 0.5, 0.0, 1.0));
    vec3 body = mix(mix(position, aPos1, a1), aPos2, a2);
    float fly = sin(3.14159 * a1) + sin(3.14159 * a2);
    body.xy += (vec2(-body.y, body.x) * 0.22 + (aSeed.xy - 0.5) * 0.9) * fly * uFlow * 0.6;
    body.z += (aSeed.w - 0.5) * fly * 1.2;
    // The burst throws them outwards.
    float burst = uStage.z;
    body.xy += normalize(body.xy + vec2(0.0001)) * burst * burst * (1.5 + aSeed.y * 7.0);
    float away = length(body.xy);
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
    p.xy += ripple(p.xy) * e;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = max(-mv.z, 0.001);

    float size = mix(0.012, 0.03, aSeed.w) * (1.0 + (1.0 - e) * 1.6);
    gl_PointSize = clamp(size * uHeight * uPixelRatio / dist, 0.0, 26.0 * uPixelRatio);

    float twinkle = 0.65 + 0.35 * sin(uTime * (1.0 + aSeed.x * 2.0) + aSeed.z * 80.0);
    float near = smoothstep(0.15, 1.4, dist);
    // Once the picture is whole the points dim to a shimmer; rising wakes them again.
    float settled = smoothstep(0.75, 1.0, uGather);
    float stirred = length(ripple(p.xy)) * 6.0;
    float rest = mix(1.0, clamp(uRest + abs(uRise) * 0.12 + fly * 0.7 + stirred, 0.0, 1.0), settled);
    rest *= 1.0 - smoothstep(0.45, 1.0, burst);
    vAlpha = mix(0.5, 1.0, e) * twinkle * near * rest * smoothstep(0.0, 0.12, uGather + 0.02);
    vColour = mix(mix(aColour, aCol1, a1), aCol2, a2);
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
  varying vec2 vWorld;
  void main() {
    vWorld = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const pictureFragment = /* glsl */ `
  ${ripple}
  uniform sampler2D uMap0;    // the soul, risen
  uniform sampler2D uMap1;    // the soul, arms open
  uniform sampler2D uMap2;    // the heart, close
  uniform sampler2D uMap3;    // the burst
  uniform vec2 uHeart0, uHeart1, uHeart2, uHeart3;   // the heart in each picture, 0..1
  uniform vec2 uSize0, uSize1, uSize2, uSize3;       // each picture's size in world units
  uniform vec3 uStage;        // progress of the three changes, each 0..1
  uniform vec3 uBurstTint;
  uniform float uBurstColour;
  uniform float uBurstGain;
  uniform float uFlow;
  uniform float uBurstWiden;  // the burst is drawn wider on wide screens, to fill them
  uniform float uReveal;      // 0 = hidden, 1 = whole
  uniform float uFade;
  uniform float uTime;
  uniform float uRise;
  uniform vec2 uCursor;       // cursor position, relative to the heart
  uniform float uCursorOn;
  uniform float uCursorRadius;
  varying vec2 vWorld;        // position relative to the heart, in world units

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  // One picture, placed by its heart, fading out softly at its own edges.
  vec3 picture(sampler2D map, vec2 heart, vec2 size, vec2 w) {
    vec2 uv = heart + w / size;
    float edge = smoothstep(0.0, 0.06, uv.x) * smoothstep(1.0, 0.94, uv.x) * smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.95, uv.y);
    return max(texture2D(map, clamp(uv, 0.0, 1.0)).rgb - 0.012, 0.0) * edge;
  }
  // A change that spreads unevenly, so one picture melts into the next.
  float melt(float t, float n) { return smoothstep(0.0, 1.0, t * 1.35 - n * 0.35); }

  void main() {
    vec2 world = vWorld;
    float r = length(world);
    float below = max(0.0, -world.y);

    // The smoke drifts: barely at the heart and face, more in the trailing veils.
    vec2 q = world * 1.6;
    float t = uTime * 0.14;
    vec2 drift = vec2(noise(q + vec2(0.0, t)) - 0.5, noise(q + vec2(5.2, -t)) - 0.5);
    vec2 w = world - drift * smoothstep(0.25, 2.6, r) * 0.12;
    w.x -= sin(uTime * 0.35 + world.y * 1.7) * 0.012 * below;
    // Rising draws the veils out behind the figure.
    w.y -= below * clamp(uRise * 0.012, -0.25, 0.25);
    // The cursor parts the smoke.
    vec2 off = world - uCursor;
    float push = smoothstep(uCursorRadius * 1.6, 0.0, length(off));
    w += normalize(off + vec2(0.0001)) * push * push * uCursorOn * 0.07;
    w -= ripple(world);

    float n = noise(world * 1.3 + 3.0) * 0.7 + noise(world * 3.1 - 9.0) * 0.3;

    // The current every form is carried on while it changes: a slow turn
    // about the heart plus a wandering drift. The form that is leaving is
    // swept forwards along it and the one arriving settles back out of it,
    // so the smoke of one becomes the smoke of the next.
    vec2 current = vec2(noise(world * 0.8 + vec2(1.7, t * 2.0)) - 0.5, noise(world * 0.8 + vec2(8.3, -t * 2.0)) - 0.5) * 1.5;
    current += vec2(-world.y, world.x) * 0.16;
    vec3 s = uStage;

    // The risen soul, revealed from the heart outwards.
    vec3 colour = picture(uMap0, uHeart0, uSize0, w + current * s.x * uFlow);
    colour *= smoothstep(0.0, 0.35, uReveal * 1.75 - r / 4.0 - n * 0.25);

    // 1. It opens its arms.
    float open = melt(s.x, n);
    vec3 opened = picture(uMap1, uHeart1, uSize1, w - current * (1.0 - s.x) * uFlow + current * s.y * uFlow * 0.5);
    colour = mix(colour, opened, open);

    // 2. Closer: the heart, in full detail, takes over the middle of the frame.
    vec2 wHeart = (w - current * (1.0 - s.y) * uFlow * 0.5) * mix(1.25, 1.0, s.y);
    vec2 uvHeart = uHeart2 + wHeart / uSize2;
    float within = 1.0 - smoothstep(0.35, 1.0, length((uvHeart - 0.5) * vec2(1.7, 2.0)));
    float close = melt(s.y, n);
    colour = mix(colour * (1.0 - close * 0.7), picture(uMap2, uHeart2, uSize2, wHeart), close * within);

    // Each change glows a little at its height, as if the light were working.
    float working = sin(3.14159 * s.x) + sin(3.14159 * s.y);
    colour *= 1.0 + working * 0.18 * exp(-r * r * 0.5);

    // 3. The burst: light swells out of the heart in a soft wave.
    float burst = s.z;
    float spin = uTime * 0.02;
    mat2 turn = mat2(cos(spin), -sin(spin), sin(spin), cos(spin));
    vec2 wb = (world - current * (1.0 - burst) * 0.4) / mix(0.3, 1.0, burst * (2.0 - burst));
    wb.x /= uBurstWiden;
    wb = turn * wb;
    vec2 uvBurst = uHeart3 + wb / uSize3;
    float reach = 1.0 - smoothstep(0.15, 1.0, length((uvBurst - uHeart3) * vec2(2.0, 2.0 * uSize3.y / uSize3.x) * 0.95));
    float front = burst * 4.5;
    float lit = (1.0 - smoothstep(front - 2.2, front + 0.001, r + (0.5 - n) * 0.8)) * smoothstep(0.0, 0.25, burst) * reach;
    vec3 light = texture2D(uMap3, clamp(uvBurst, 0.0, 1.0)).rgb;
    // Quieten the burst: less colour, less glare, tinted to sit with the page.
    light = pow(light, vec3(1.5));   // deepen the haze so the threads of light stay clear
    light = mix(vec3(dot(light, vec3(0.333))), light, uBurstColour) * uBurstTint * uBurstGain;
    colour = colour * (1.0 - lit * 0.9) + light * lit;

    // The heart breathes.
    float pulse = 0.5 + 0.5 * sin(uTime * 0.9);
    colour *= 1.0 + exp(-r * r * 3.0) * pulse * 0.22;

    gl_FragColor = vec4(colour * uFade, 1.0);
  }
`;

type Built = { geometry: THREE.BufferGeometry; textures: THREE.Texture[] };

function build(images: HTMLImageElement[], count: number): Built {
  const img = images[0];
  const rand = seeded(20261112);
  const { positions, colours } = sampleImage(img, count, rand, {
    width: WIDTH,
    height: HEIGHT,
    heart: soul.heart,
  });
  // The same particles, placed again on each later form.
  const later = soul.forms.slice(0, 2).map((form, i) =>
    sampleImage(images[i + 1], count, rand, {
      width: form.height * soul.aspect,
      height: form.height,
      heart: form.heart,
    }),
  );
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
  later.forEach((form, i) => {
    geometry.setAttribute(
      `aPos${i + 1}`,
      new THREE.BufferAttribute(form.positions, 3),
    );
    geometry.setAttribute(
      `aCol${i + 1}`,
      new THREE.BufferAttribute(form.colours, 3),
    );
  });
  geometry.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));

  const textures = images.map((image) => {
    const texture = new THREE.Texture(image);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  });
  return { geometry, textures };
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
  // Where the visitor is pressing, in screen coordinates from -1 to 1.
  const press = useRef({ down: false, x: 0, y: 0 });

  useEffect(() => {
    const at = (e: PointerEvent) => {
      press.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      press.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const down = (e: PointerEvent) => {
      at(e);
      press.current.down = true;
    };
    const up = () => {
      press.current.down = false;
    };
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointermove", at, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", at);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);
  const motion = useRef<{
    start: number | null;
    lastY: number;
    follow: { v: number };
    stage: { v: number }[];
    waveIndex: number;
    wasDown: boolean;
    lastWave: THREE.Vector2;
    lastWaveAt: number;
    staged: boolean;
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
    Promise.all([soul.image, ...soul.forms.map((f) => f.image)].map(loadImage))
      .then((images) => {
        if (!alive) return;
        made = build(images, count);
        setBuilt(made);
      })
      .catch(() => {
        // Without the picture the guide light alone carries the scene.
      });
    return () => {
      alive = false;
      made?.geometry.dispose();
      made?.textures.forEach((t) => t.dispose());
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
      uStage: { value: new THREE.Vector3() },
      uFlow: { value: soul.flow },
      uWave: {
        value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, -99, 0)),
      },
      uWaveDir: { value: Array.from({ length: 6 }, () => new THREE.Vector2()) },
      uNow: { value: 0 },
      uFade: { value: 1 },
      // Fewer particles each carry a little more light, so every tier reads alike.
      uOpacity: { value: Math.min(0.9, 0.2 * Math.sqrt(70000 / count)) },
    }),
    [count],
  );

  const pictureUniforms = useMemo(
    () => ({
      uMap0: { value: null as THREE.Texture | null },
      uMap1: { value: null as THREE.Texture | null },
      uMap2: { value: null as THREE.Texture | null },
      uMap3: { value: null as THREE.Texture | null },
      uHeart0: { value: new THREE.Vector2(...soul.heart) },
      uSize0: { value: new THREE.Vector2(WIDTH, HEIGHT) },
      ...Object.fromEntries(
        soul.forms.flatMap((f, i) => [
          [`uHeart${i + 1}`, { value: new THREE.Vector2(...f.heart) }],
          [
            `uSize${i + 1}`,
            { value: new THREE.Vector2(f.height * soul.aspect, f.height) },
          ],
        ]),
      ),
      uStage: { value: new THREE.Vector3() },
      uWave: {
        value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, -99, 0)),
      },
      uWaveDir: { value: Array.from({ length: 6 }, () => new THREE.Vector2()) },
      uNow: { value: 0 },
      uBurstTint: { value: new THREE.Color(soul.burstTint) },
      uBurstWiden: { value: 1 },
      uBurstColour: { value: soul.burstColour },
      uBurstGain: { value: soul.burstGain },
      uFlow: { value: soul.flow },
      uReveal: { value: 0 },
      uFade: { value: 1 },
      uTime: { value: 0 },
      uRise: { value: 0 },
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
      stage: [{ v: 0 }, { v: 0 }, { v: 0 }],
      waveIndex: 0,
      wasDown: false,
      lastWave: new THREE.Vector2(),
      lastWaveAt: -9,
      staged: false,
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
    pu.uMap0.value = built.textures[0];
    pu.uMap1.value = built.textures[1];
    pu.uMap2.value = built.textures[2];
    pu.uMap3.value = built.textures[3];
    pu.uBurstWiden.value = THREE.MathUtils.clamp(
      (state.size.width / state.size.height) * 1.15,
      1,
      2.4,
    );
    // The three changes of form, each over its own stretch of the scroll.
    const stage = pu.uStage.value as THREE.Vector3;
    // Each takes its time even when the visitor scrolls fast, so nothing snaps.
    const settle = (now: number, index: number) => {
      const goal = THREE.MathUtils.smoothstep(
        progress,
        ...soul.forms[index].over,
      );
      return reducedMotion || !m.staged
        ? goal
        : smoothDamp(now, goal, m.stage[index], soul.formSmoothTime, dt);
    };
    stage.set(settle(stage.x, 0), settle(stage.y, 1), settle(stage.z, 2));
    m.staged = true;

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
    // Pressing starts a ripple; dragging sends more along the path of the drag.
    const held = press.current.down && !reducedMotion && progress < 0.5;
    if (held) {
      m.ray.setFromCamera(
        m.ndc.set(press.current.x, press.current.y),
        state.camera,
      );
      if (m.ray.ray.intersectPlane(m.plane, m.hit)) {
        g.worldToLocal(m.hit);
        const first = !m.wasDown;
        const dx = m.hit.x - m.lastWave.x;
        const dy = m.hit.y - m.lastWave.y;
        const moved = Math.hypot(dx, dy);
        if (
          first ||
          (moved > soul.rippleSpacing && now - m.lastWaveAt > 0.07)
        ) {
          const i = m.waveIndex++ % 6;
          const speed = first ? 0 : moved / Math.max(now - m.lastWaveAt, 0.016);
          const strength = first
            ? soul.rippleStrength * 0.8
            : soul.rippleStrength * Math.min(1.4, 0.5 + speed * 0.12);
          for (const uniforms of [u, pu]) {
            (uniforms.uWave.value as THREE.Vector4[])[i].set(
              m.hit.x,
              m.hit.y,
              now,
              strength,
            );
            (uniforms.uWaveDir.value as THREE.Vector2[])[i].set(
              first ? 0 : dx / (moved + 1e-4),
              first ? 0 : dy / (moved + 1e-4),
            );
          }
          m.lastWave.set(m.hit.x, m.hit.y);
          m.lastWaveAt = now;
        }
      }
    }
    m.wasDown = held;
    u.uNow.value = now;
    pu.uNow.value = now;
    // The particles and the pictures stay until the beam leaves.
    const present = 1 - THREE.MathUtils.smoothstep(progress, ...soul.leave);
    u.uFade.value = present;
    pu.uFade.value = present;
    (u.uStage.value as THREE.Vector3).copy(stage);
    m.cursorNow = smoothDamp(
      m.cursorNow,
      pointerActive && !reducedMotion && progress < 0.5 ? 1 : 0,
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
      <mesh frustumCulled={false} renderOrder={2}>
        {/* One wide sheet centred on the heart; every picture is placed within it. */}
        <planeGeometry args={[soul.sheet, soul.sheet]} />
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
