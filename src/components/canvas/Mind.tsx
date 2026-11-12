"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { story } from "@/content/story";
import { seeded } from "@/lib/soulImage";
import { useStore } from "@/lib/store";
import { cameraGoal } from "@/motion/director";
import { mind, sceneProgress } from "@/motion/timeline";

const threadVertex = /* glsl */ `
  uniform float uGrow;      // 0 = nothing, 1 = every thread fully drawn
  uniform float uGather;    // 0 = open, 1 = drawn back into the light
  uniform float uTime;
  attribute float aT;       // 0 at the light, 1 at the tip of the thread
  attribute float aSeed;
  varying float vT;
  varying float vSeed;
  varying float vShow;

  void main() {
    // Each thread is drawn back a little after the one before it.
    float pull = clamp(uGather * 1.5 - aSeed * 0.5, 0.0, 1.0);
    pull = pull * pull * (3.0 - 2.0 * pull);
    vec3 p = position * (1.0 - pull);
    // The threads sway, more at their tips.
    p += vec3(sin(uTime * 0.35 + aSeed * 30.0), cos(uTime * 0.3 + aSeed * 50.0), sin(uTime * 0.25 + aSeed * 70.0)) * 0.05 * aT * (1.0 - pull);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    vT = aT;
    vSeed = aSeed;
    // Threads grow outwards from the light, each at its own pace.
    float reach = uGrow * (1.25 + aSeed * 0.5);
    vShow = smoothstep(reach, reach - 0.12, aT);
  }
`;

const threadFragment = /* glsl */ `
  uniform vec3 uCore;
  uniform vec3 uFar;
  uniform float uOpacity;
  uniform float uTime;
  varying float vT;
  varying float vSeed;
  varying float vShow;

  void main() {
    vec3 colour = mix(uCore, uFar, smoothstep(0.05, 0.75, vT));
    float alpha = pow(1.0 - vT, 0.8) * 0.9 + 0.1;
    // A thought travels out along the thread now and then.
    float at = fract(uTime * (0.05 + vSeed * 0.05) + vSeed * 7.0) * 1.6 - 0.2;
    float thought = smoothstep(0.05, 0.0, abs(vT - at));
    colour = mix(colour, uCore, thought);
    alpha += thought * 0.6;
    gl_FragColor = vec4(colour, alpha * vShow * uOpacity);
  }
`;

const nodeVertex = /* glsl */ `
  uniform float uLit;       // how many nodes are lit, as a running number
  uniform float uGrow;
  uniform float uGather;
  uniform float uPixelRatio;
  uniform float uHeight;
  attribute float aIndex;
  varying float vLit;

  void main() {
    vec3 p = position * (1.0 - smoothstep(0.0, 0.8, uGather));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vLit = clamp(uLit - aIndex, 0.0, 1.0);
    float size = mix(0.12, 0.34, vLit) * smoothstep(0.7, 1.0, uGrow);
    gl_PointSize = min(size * uHeight * uPixelRatio / max(-mv.z, 0.2), 220.0 * uPixelRatio);
  }
`;

const nodeFragment = /* glsl */ `
  uniform vec3 uCore;
  uniform vec3 uFar;
  uniform float uOpacity;
  varying float vLit;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = smoothstep(0.22, 0.0, d);
    float halo = pow(max(0.0, 1.0 - d), 3.0);
    vec3 colour = mix(uFar, uCore, vLit);
    gl_FragColor = vec4(colour, (core + halo * 0.45 * vLit) * mix(0.35, 1.0, vLit) * uOpacity);
  }
`;

/** Builds a few wandering threads from the centre, each with a branch or two. */
function buildThreads(nodeCount: number) {
  const rand = seeded(4711);
  const positions: number[] = [];
  const along: number[] = [];
  const seeds: number[] = [];
  const nodes: number[] = [];
  const candidates: THREE.Vector3[] = [];

  const grow = (
    start: THREE.Vector3,
    dir: THREE.Vector3,
    steps: number,
    from: number,
    seed: number,
    depth: number,
  ) => {
    const p = start.clone();
    const d = dir.clone().normalize();
    const total = mind.steps;
    for (let i = 0; i < steps; i++) {
      const next = p.clone().addScaledVector(d, mind.reach / total);
      const t0 = from + i / total;
      const t1 = from + (i + 1) / total;
      positions.push(p.x, p.y, p.z, next.x, next.y, next.z);
      along.push(Math.min(1, t0), Math.min(1, t1));
      seeds.push(seed, seed);
      p.copy(next);
      if (depth === 0 && i === Math.floor(total * mind.nodeAt))
        candidates.push(p.clone());
      // Wander gently, and keep heading outwards.
      d.x += (rand() - 0.5) * mind.wander;
      d.y += (rand() - 0.5) * mind.wander;
      d.z += (rand() - 0.5) * mind.wander;
      d.addScaledVector(p.clone().normalize(), 0.06).normalize();
      if (depth < 1 && i > total * 0.25 && rand() < mind.branch) {
        const side = new THREE.Vector3(
          rand() - 0.5,
          rand() - 0.5,
          rand() - 0.5,
        ).multiplyScalar(1.1);
        grow(
          p,
          d.clone().add(side),
          Math.floor((steps - i) * 0.7),
          t0,
          rand(),
          depth + 1,
        );
      }
    }
  };

  for (let i = 0; i < mind.threads; i++) {
    // Spread evenly over a sphere, flattened a little towards the screen.
    const y = 1 - (2 * (i + 0.5)) / mind.threads;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996 + rand() * 0.5;
    const dir = new THREE.Vector3(Math.cos(a) * r, y * 0.8, Math.sin(a) * r);
    grow(new THREE.Vector3(), dir, mind.steps, 0, rand(), 0);
  }
  // Principles sit part-way along the threads that stay best in view:
  // out to the sides, near the camera's eye line, and not behind it.
  const score = (v: THREE.Vector3) =>
    Math.abs(v.x) - Math.abs(v.y) * 1.5 - Math.max(0, v.z) * 2;
  candidates
    .sort((a, b) => score(b) - score(a))
    .slice(0, nodeCount)
    .forEach((v) => nodes.push(v.x, v.y, v.z));
  return {
    positions: new Float32Array(positions),
    along: new Float32Array(along),
    seeds: new Float32Array(seeds),
    nodes: new Float32Array(nodes),
  };
}

/**
 * The mind. Inside the heart, a few fine threads of light grow out from the
 * one light; a principle lights at the tip of a thread as the visitor
 * scrolls; then every thread is drawn back into the light as intention forms.
 */
export function Mind() {
  const group = useRef<THREE.Group>(null);
  const threads = useRef<THREE.ShaderMaterial>(null);
  const nodes = useRef<THREE.ShaderMaterial>(null);
  const nodeCount = story.awakening.lines?.length ?? 3;

  const { threadGeometry, nodeGeometry, count } = useMemo(() => {
    const built = buildThreads(nodeCount);
    const t = new THREE.BufferGeometry();
    t.setAttribute("position", new THREE.BufferAttribute(built.positions, 3));
    t.setAttribute("aT", new THREE.BufferAttribute(built.along, 1));
    t.setAttribute("aSeed", new THREE.BufferAttribute(built.seeds, 1));
    const n = new THREE.BufferGeometry();
    const made = built.nodes.length / 3;
    n.setAttribute("position", new THREE.BufferAttribute(built.nodes, 3));
    n.setAttribute(
      "aIndex",
      new THREE.BufferAttribute(
        new Float32Array(Array.from({ length: made }, (_, i) => i)),
        1,
      ),
    );
    return { threadGeometry: t, nodeGeometry: n, count: made };
  }, [nodeCount]);

  const shared = useMemo(
    () => ({
      uGrow: { value: 0 },
      uGather: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uCore: { value: new THREE.Color(mind.coreColour) },
      uFar: { value: new THREE.Color(mind.threadColour) },
    }),
    [],
  );
  const nodeUniforms = useMemo(
    () => ({
      ...shared,
      uLit: { value: 0 },
      uPixelRatio: { value: 1 },
      uHeight: { value: 800 },
    }),
    [shared],
  );
  const scratch = useMemo(
    () => ({ p: new THREE.Vector3(), t: new THREE.Vector3() }),
    [],
  );

  useFrame((state) => {
    const g = group.current;
    const u = threads.current?.uniforms;
    const nu = nodes.current?.uniforms;
    if (!g || !u || !nu) return;
    const { progress, reducedMotion } = useStore.getState();
    const [growFrom, growTo] = mind.grow;
    const [gatherFrom, gatherTo] = mind.gather;
    const shown =
      THREE.MathUtils.smoothstep(progress, growFrom, growFrom + 0.02) *
      (1 - THREE.MathUtils.smoothstep(progress, gatherTo, gatherTo + 0.03));
    g.visible = shown > 0.001;
    if (!g.visible) return;

    // The web is centred on the light the visitor follows.
    cameraGoal(progress, scratch.p, scratch.t);
    g.position.copy(scratch.t);

    u.uGrow.value = THREE.MathUtils.smoothstep(progress, growFrom, growTo);
    u.uGather.value = THREE.MathUtils.smoothstep(
      progress,
      gatherFrom,
      gatherTo,
    );
    u.uOpacity.value = shown * mind.opacity;
    u.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime;
    // The nodes keep their own copies of the shared values.
    nu.uGrow.value = u.uGrow.value;
    nu.uGather.value = u.uGather.value;
    nu.uOpacity.value = shown;
    // Principles light one after another through the Awakening scene.
    nu.uLit.value =
      THREE.MathUtils.smoothstep(
        sceneProgress("awakening", progress),
        0.45,
        0.95,
      ) * count;
    nu.uPixelRatio.value = state.gl.getPixelRatio();
    nu.uHeight.value = state.size.height;
  });

  return (
    <group ref={group} visible={false}>
      <lineSegments
        geometry={threadGeometry}
        frustumCulled={false}
        renderOrder={3}
      >
        <shaderMaterial
          ref={threads}
          vertexShader={threadVertex}
          fragmentShader={threadFragment}
          uniforms={shared}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      <points geometry={nodeGeometry} frustumCulled={false} renderOrder={4}>
        <shaderMaterial
          ref={nodes}
          vertexShader={nodeVertex}
          fragmentShader={nodeFragment}
          uniforms={nodeUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
