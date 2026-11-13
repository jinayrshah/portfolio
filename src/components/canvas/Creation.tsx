"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { loadImage } from "@/lib/soulImage";
import { smoothDamp } from "@/lib/spring";
import { useStore } from "@/lib/store";
import { tierSettings } from "@/lib/device";
import { sampleImage, seeded } from "@/lib/soulImage";
import { treeNow } from "@/motion/now";
import { creation, soul, work } from "@/motion/timeline";
import { projects } from "@/content/work";

const vertex = /* glsl */ `
  varying vec2 vScreen;
  void main() {
    vScreen = position.xy;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uBeam;
  uniform sampler2D uRibbon;
  uniform sampler2D uTree;
  uniform float uAspect;        // width / height of the screen
  uniform float uPictureAspect; // width / height of the pictures
  uniform float uTime;
  uniform float uStream;        // the burst's dust streams into the beam
  uniform float uBeamIn;        // the beam appears out of the burst
  uniform float uPan;           // the frame glides along the beam to its star
  uniform float uSettle;        // the star sinks to where the tree will root
  uniform float uGrow;          // the tree grows
  uniform float uBeamOut;       // the beam melts away into the tree
  uniform float uDim;           // the tree rests for the closing scene
  uniform vec2 uBeamStart, uBeamStar, uRibbonStar, uTreeBase;
  uniform float uTreeScale;
  uniform vec2 uTreeShift;
  uniform float uRootY;
  uniform vec3 uTint;
  uniform float uColour;
  varying vec2 vScreen;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float ease(float t) { return t * t * (3.0 - 2.0 * t); }

  // A picture placed so that the point 'anchor' of it sits at 'at' on the screen.
  // 'scale' is the picture's height, where the screen is 2 high.
  vec3 picture(sampler2D map, vec2 anchor, vec2 at, float scale, vec2 f) {
    vec2 uv = anchor + (f - at) / vec2(scale * uPictureAspect, scale);
    float edge = smoothstep(0.0, 0.14, uv.x) * (1.0 - smoothstep(0.95, 1.0, uv.x)) * smoothstep(0.0, 0.06, uv.y) * (1.0 - smoothstep(0.94, 1.0, uv.y));
    // The maker's mark in the corner of two of the pictures is left out.
    edge *= 1.0 - smoothstep(0.9, 0.93, uv.x) * (1.0 - smoothstep(0.11, 0.14, uv.y));
    vec3 c = max(texture2D(map, clamp(uv, 0.0, 1.0)).rgb - 0.02, 0.0) * edge;
    return mix(vec3(dot(c, vec3(0.333))), c, uColour) * uTint;
  }

  void main() {
    vec2 f = vec2(vScreen.x * uAspect, vScreen.y);
    float t = uTime * 0.12;
    vec2 drift = vec2(noise(f * 1.4 + vec2(0.0, t)) - 0.5, noise(f * 1.4 + vec2(5.2, -t)) - 0.5);
    float n = noise(f * 1.6 + 4.0) * 0.65 + noise(f * 4.0 - 2.0) * 0.35;

    // The one light: the star at the tip of the beam, later the root of the tree.
    vec2 light = vec2(0.0, uRootY * ease(uSettle));

    // ---- The beam: the frame glides along it from the burst to its star. ----
    float pan = ease(uPan);
    float zoom = mix(3.4, 1.7, pan) * mix(1.0, 0.8, ease(uSettle));
    vec2 fb = f + drift * 0.05 * (1.0 - pan * 0.5);
    // The finer river sways a little against the first, so the two never lock together.
    vec2 flow = vec2(sin(uTime * 0.17) * 0.006, cos(uTime * 0.13) * 0.004);
    vec3 beam = picture(uBeam, mix(uBeamStart, uBeamStar, pan), light, zoom, fb);
    // A second, finer river behind it, moving a little slower, for depth.
    vec3 ribbon = picture(uRibbon, mix(uBeamStart + vec2(0.06, 0.02), uRibbonStar, pan * 0.94 + 0.06) - flow, light, zoom * 0.86, fb - drift * 0.03);
    // The picture only fills in under the strands the dust has already drawn.
    float beamShown = smoothstep(0.0, 1.0, uBeamIn * 1.4 - (1.0 - n) * 0.4) * (1.0 - smoothstep(0.0, 1.0, uBeamOut * 1.4 - n * 0.4));
    vec3 colour = (beam + ribbon * 0.45) * beamShown;

    // ---- The tree: grows from its root, up through the trunk, out to the blossoms. ----
    vec2 ft = f + drift * 0.035 * smoothstep(0.2, 1.4, length(f - light));
    vec2 root = light + uTreeShift;
    vec3 tree = picture(uTree, uTreeBase, root, uTreeScale, ft);
    vec2 fromRoot = (f - root) / uTreeScale;
    float reach = length(fromRoot * vec2(0.75, 1.0));
    float grown = uGrow * 1.15;
    float shown = 1.0 - smoothstep(grown - 0.22, grown, reach + (n - 0.5) * 0.16);
    // The growing edge glows as it climbs.
    float edgeGlow = (1.0 - smoothstep(0.0, 0.16, abs(reach - (grown - 0.08)))) * (1.0 - smoothstep(0.85, 1.0, uGrow));
    tree *= shown * (1.0 + edgeGlow * 1.6);
    // Blossoms twinkle once the tree is whole.
    float lum = dot(tree, vec3(0.333));
    float twinkle = 0.5 + 0.5 * sin(uTime * 2.2 + hash(floor(f * 40.0)) * 6.283);
    tree *= 1.0 + smoothstep(0.55, 0.9, lum) * twinkle * 0.5 * smoothstep(0.8, 1.0, uGrow) * smoothstep(0.1, 0.4, fromRoot.y);
    colour += tree * mix(1.0, 0.3, uDim);

    // The light itself, so the eye never loses it between beam and tree.
    float d = length(f - light);
    float star = exp(-d * d * 90.0) * 1.2 + exp(-d * d * 9.0) * 0.22;
    float pulse = 0.85 + 0.15 * sin(uTime * 0.9);
    colour += uTint * star * pulse * smoothstep(0.05, 0.4, uStream) * (1.0 - smoothstep(0.5, 1.0, uGrow) * 0.8);

    gl_FragColor = vec4(colour, 1.0);
  }
`;

/*
 * The dust. Each point starts at a place on the burst and ends on a line of
 * the beam. As the burst lets go they drift outward, then a current draws
 * them sideways into strands that settle onto the beam, which then fills in
 * beneath them. Pairs are matched by height, so the flow runs sideways.
 */
const dustVertex = /* glsl */ `
  attribute vec2 aFrom;   // offset from the burst's heart, as a share of its size
  attribute vec2 aTo;     // a point on the beam picture, 0..1
  attribute vec3 aColour;
  attribute float aSeed;
  uniform float uStream, uAspect, uPictureAspect, uTime, uSize, uFade;
  uniform vec2 uBurstSize, uBeamAnchor, uBeamAt;
  uniform float uBeamZoom;
  varying vec3 vColour;
  varying float vAlpha;
  float ease(float t) { return t * t * (3.0 - 2.0 * t); }
  void main() {
    vec2 from = aFrom * vec2(uBurstSize.x * uAspect, uBurstSize.y);
    vec2 to = uBeamAt + (aTo - uBeamAnchor) * vec2(uBeamZoom * uPictureAspect, uBeamZoom);
    // Each point lets go at its own moment.
    float d = clamp(uStream * 1.6 - aSeed * 0.6, 0.0, 1.0);
    float e = ease(d);
    float ex = pow(d, 1.4);                     // along the current: slow, then fast
    float ey = ease(min(1.0, d * 1.6));         // across it: gathers into a strand early
    vec2 p = vec2(mix(from.x, to.x, ex), mix(from.y, to.y, ey));
    float lift = sin(3.14159 * e);
    p += from * 0.25 * lift * clamp(uStream * 4.0, 0.0, 1.0);   // the burst breathes out first
    p.y += sin(from.x * 3.0 + e * 6.0 + aSeed * 6.283) * 0.05 * lift;
    p += vec2(sin(uTime * 0.6 + aSeed * 40.0), cos(uTime * 0.5 + aSeed * 31.0)) * 0.006;
    gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
    gl_PointSize = uSize * (0.6 + aSeed * 0.9) * (1.0 + lift * 0.4);
    vColour = aColour;
    // Appear as the burst picture dissolves; fade to a few sparks once the beam is drawn.
    float show = smoothstep(0.0, 0.12, uStream) * mix(1.0, 0.25, smoothstep(0.8, 1.0, uStream));
    vAlpha = show * (0.45 + lift * 0.9) * uFade;
  }
`;

const dustFragment = /* glsl */ `
  uniform vec3 uTint;
  uniform float uColour;
  varying vec3 vColour;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    vec3 c = mix(vec3(dot(vColour, vec3(0.333))), vColour, uColour) * uTint;
    gl_FragColor = vec4(c * a * a * vAlpha, 1.0);
  }
`;

const keys = [
  "stream",
  "beamIn",
  "pan",
  "settle",
  "grow",
  "beamOut",
  "dim",
] as const;
type Key = (typeof keys)[number];

/**
 * Creation. Drawn across the whole screen in front of the world: the burst
 * gathers into a river of light, the frame glides along it to the star at its
 * tip, the star sinks and takes root, and the tree grows out of it.
 */
export function Creation() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const dustMaterial = useRef<THREE.ShaderMaterial>(null);
  const dustPoints = useRef<THREE.Points>(null);
  const [textures, setTextures] = useState<THREE.Texture[] | null>(null);
  const [dust, setDust] = useState<THREE.BufferGeometry | null>(null);
  const motion = useRef<{
    ready: boolean;
    value: Record<Key, number>;
    speed: Record<Key, { v: number }>;
    focus: number;
    focusSpeed: { v: number };
  }>(null);

  useEffect(() => {
    let alive = true;
    let made: THREE.Texture[] = [];
    let geometry: THREE.BufferGeometry | null = null;
    const burstSrc = soul.forms.find((f) => f.name === "burst")?.image;
    Promise.all(
      [
        creation.beam,
        creation.ribbon,
        creation.tree,
        burstSrc ?? creation.beam,
      ].map(loadImage),
    )
      .then((images) => {
        if (!alive) return;
        made = images.slice(0, 3).map((image) => {
          const texture = new THREE.Texture(image);
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = 4;
          texture.needsUpdate = true;
          return texture;
        });
        setTextures(made);

        // The dust: points on the burst, each paired with a point on the beam.
        const count = creation.dust[useStore.getState().tier];
        const rand = seeded(7);
        const from = sampleImage(images[3], count, rand, {
          width: 1,
          height: 1,
          heart: creation.burstHeart,
        });
        const to = sampleImage(images[0], count, rand, {
          width: 1,
          height: 1,
          heart: [0, 0],
        });
        // Match by height, so each point travels sideways into its strand.
        const byHeight = (pos: Float32Array) =>
          Array.from({ length: count }, (_, i) => i).sort(
            (a, b) => pos[a * 3 + 1] - pos[b * 3 + 1],
          );
        const fromOrder = byHeight(from.positions);
        const toOrder = byHeight(to.positions);
        const aFrom = new Float32Array(count * 2);
        const aTo = new Float32Array(count * 2);
        const aColour = new Float32Array(count * 3);
        const aSeed = new Float32Array(count);
        for (let n = 0; n < count; n++) {
          const a = fromOrder[n];
          const b = toOrder[n];
          aFrom[n * 2] = from.positions[a * 3];
          aFrom[n * 2 + 1] = from.positions[a * 3 + 1];
          // Leave the maker's mark in the beam picture's corner unsampled.
          const tx = to.positions[b * 3];
          const ty = to.positions[b * 3 + 1];
          const mark = tx > 0.9 && ty < 0.14;
          aTo[n * 2] = mark ? 0.5 : tx;
          aTo[n * 2 + 1] = mark ? 0.5 : ty;
          for (let c = 0; c < 3; c++)
            aColour[n * 3 + c] =
              (from.colours[a * 3 + c] + to.colours[b * 3 + c]) * 0.5;
          aSeed[n] = rand();
        }
        geometry = new THREE.BufferGeometry();
        // three needs a position attribute to know how many points to draw.
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(count * 3), 3),
        );
        geometry.setAttribute("aFrom", new THREE.BufferAttribute(aFrom, 2));
        geometry.setAttribute("aTo", new THREE.BufferAttribute(aTo, 2));
        geometry.setAttribute("aColour", new THREE.BufferAttribute(aColour, 3));
        geometry.setAttribute("aSeed", new THREE.BufferAttribute(aSeed, 1));
        setDust(geometry);
      })
      .catch(() => {
        // Without the pictures the scene stays dark and the text carries it.
      });
    return () => {
      alive = false;
      made.forEach((t) => t.dispose());
      geometry?.dispose();
    };
  }, []);

  const uniforms = useMemo(
    () => ({
      uBeam: { value: null as THREE.Texture | null },
      uRibbon: { value: null as THREE.Texture | null },
      uTree: { value: null as THREE.Texture | null },
      uAspect: { value: 1 },
      uPictureAspect: { value: creation.pictureAspect },
      uTime: { value: 0 },
      uStream: { value: 0 },
      uBeamIn: { value: 0 },
      uPan: { value: 0 },
      uSettle: { value: 0 },
      uGrow: { value: 0 },
      uBeamOut: { value: 0 },
      uDim: { value: 0 },
      uBeamStart: { value: new THREE.Vector2(...creation.beamStart) },
      uBeamStar: { value: new THREE.Vector2(...creation.beamStar) },
      uRibbonStar: { value: new THREE.Vector2(...creation.ribbonStar) },
      uTreeBase: { value: new THREE.Vector2(...creation.treeBase) },
      uTreeScale: { value: 2 },
      uTreeShift: { value: new THREE.Vector2() },
      uRootY: { value: -0.5 },
      uTint: { value: new THREE.Color(creation.tint) },
      uColour: { value: creation.colour },
    }),
    [],
  );

  const dustUniforms = useMemo(
    () => ({
      uStream: { value: 0 },
      uAspect: { value: 1 },
      uPictureAspect: { value: creation.pictureAspect },
      uTime: { value: 0 },
      uSize: { value: creation.dustSize },
      uFade: { value: 1 },
      uBurstSize: { value: new THREE.Vector2(...creation.burstSize) },
      uBeamAnchor: { value: new THREE.Vector2() },
      uBeamAt: { value: new THREE.Vector2() },
      uBeamZoom: { value: 3.4 },
      uTint: { value: new THREE.Color(creation.tint) },
      uColour: { value: creation.colour },
    }),
    [],
  );

  useFrame((state, delta) => {
    const mesh = material.current;
    if (!mesh || !textures) return;
    const u = mesh.uniforms;
    const m = (motion.current ??= {
      ready: false,
      value: Object.fromEntries(keys.map((k) => [k, 0])) as Record<Key, number>,
      speed: Object.fromEntries(keys.map((k) => [k, { v: 0 }])) as Record<
        Key,
        { v: number }
      >,
      focus: 0,
      focusSpeed: { v: 0 },
    });
    const dt = Math.min(delta, 1 / 20);
    const { progress, reducedMotion, work: workProgress } = useStore.getState();

    // Where the Work chapter is, in steps: project i is fully open at i.
    const step = work.position(workProgress);
    const count = projects.length;
    const ss = THREE.MathUtils.smoothstep;
    // The tree holds the projects, then rests behind the cards.
    const focusGoal =
      workProgress > 0
        ? ss(step, -1, -0.55) * (1 - ss(step, count - 0.45, count + 0.1))
        : 0;
    const cardsDim = workProgress > 0 ? ss(step, count - 0.45, count + 0.1) : 0;

    // Each move follows the scroll with weight, so a fast scroll cannot snap it.
    for (const key of keys) {
      let goal = ss(progress, ...creation.over[key]);
      if (key === "dim") goal = Math.max(goal, cardsDim);
      m.value[key] =
        reducedMotion || !m.ready
          ? goal
          : smoothDamp(
              m.value[key],
              goal,
              m.speed[key],
              creation.smoothTime,
              dt,
            );
    }
    m.focus =
      reducedMotion || !m.ready
        ? focusGoal
        : smoothDamp(
            m.focus,
            focusGoal,
            m.focusSpeed,
            creation.smoothTime * 1.4,
            dt,
          );
    m.ready = true;

    u.uBeam.value = textures[0];
    u.uRibbon.value = textures[1];
    u.uTree.value = textures[2];
    u.uStream.value = m.value.stream;
    u.uBeamIn.value = m.value.beamIn;
    u.uPan.value = m.value.pan;
    u.uSettle.value = m.value.settle;
    u.uGrow.value = m.value.grow;
    u.uBeamOut.value = m.value.beamOut;
    u.uDim.value = m.value.dim;
    const aspect = state.size.width / state.size.height;
    u.uAspect.value = aspect;
    const time = reducedMotion ? 0 : state.clock.elapsedTime;
    u.uTime.value = time;

    // The tree fills a wide screen and is drawn smaller on a tall one, so its crown still fits.
    const fit = THREE.MathUtils.clamp(
      creation.treeFit * aspect,
      creation.treeScale[0],
      creation.treeScale[1],
    );
    const wide = aspect > 1.1;
    const f = m.focus;
    const { focus } = creation;
    const scale =
      fit * THREE.MathUtils.lerp(1, wide ? focus.scale : focus.phoneScale, f);
    u.uTreeScale.value = scale;
    // Root the tree so that the whole of it sits centred on the screen.
    const rootY = (creation.treeBase[1] - 0.5) * scale + creation.treeLift;
    u.uRootY.value = rootY;
    const shiftX = wide ? focus.shift * 2 * aspect * f : 0;
    const shiftY = wide ? 0 : focus.lift * f;
    u.uTreeShift.value.set(shiftX, shiftY);
    const settle = m.value.settle;
    const settled = settle * settle * (3 - 2 * settle);
    treeNow.x = shiftX;
    treeNow.y = rootY * settled + shiftY;
    treeNow.scale = scale;
    treeNow.focus = f;
    treeNow.ready = m.value.grow > 0.95;

    mesh.visible = m.value.stream > 0.001;

    // The dust follows the beam as the frame glides along it.
    const d = dustMaterial.current?.uniforms;
    if (d && dustPoints.current) {
      const pan = m.value.pan;
      const panE = pan * pan * (3 - 2 * pan);
      d.uStream.value = m.value.stream;
      d.uAspect.value = aspect;
      d.uTime.value = time;
      d.uSize.value =
        creation.dustSize *
        Math.min(
          state.viewport.dpr,
          tierSettings[useStore.getState().tier].dpr,
        );
      d.uBeamZoom.value =
        THREE.MathUtils.lerp(3.4, 1.7, panE) *
        THREE.MathUtils.lerp(1, 0.8, settled);
      d.uBeamAnchor.value.set(
        THREE.MathUtils.lerp(creation.beamStart[0], creation.beamStar[0], panE),
        THREE.MathUtils.lerp(creation.beamStart[1], creation.beamStar[1], panE),
      );
      d.uBeamAt.value.set(0, rootY * settled);
      // The dust leaves with the beam.
      d.uFade.value = 1 - ss(m.value.beamOut, 0, 0.7);
      dustPoints.current.visible =
        m.value.stream > 0.001 && d.uFade.value > 0.001;
    }
  });

  if (!textures) return null;

  return (
    <>
      <mesh frustumCulled={false} renderOrder={6}>
        <planeGeometry args={[2, 2]} />
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
      </mesh>
      {dust && (
        <points
          ref={dustPoints}
          geometry={dust}
          frustumCulled={false}
          renderOrder={7}
        >
          <shaderMaterial
            ref={dustMaterial}
            vertexShader={dustVertex}
            fragmentShader={dustFragment}
            uniforms={dustUniforms}
            transparent
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}
    </>
  );
}
