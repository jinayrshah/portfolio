"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { loadImage } from "@/lib/soulImage";
import { smoothDamp } from "@/lib/spring";
import { useStore } from "@/lib/store";
import { creation } from "@/motion/timeline";

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
  uniform float uBeamIn;        // the beam appears out of the burst
  uniform float uPan;           // the frame glides along the beam to its star
  uniform float uSettle;        // the star sinks to where the tree will root
  uniform float uGrow;          // the tree grows
  uniform float uBeamOut;       // the beam melts away into the tree
  uniform float uDim;           // the tree rests for the closing scene
  uniform vec2 uBeamStart, uBeamStar, uRibbonStar, uTreeBase;
  uniform float uTreeScale;
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
    float beamShown = ease(uBeamIn) * (1.0 - smoothstep(0.0, 1.0, uBeamOut * 1.4 - n * 0.4));
    // It arrives from the centre of the burst outwards.
    beamShown *= smoothstep(0.0, 0.4, uBeamIn * 2.6 - length(f) * 0.5 - n * 0.3);
    vec3 colour = (beam + ribbon * 0.45) * beamShown;

    // ---- The tree: grows from its root, up through the trunk, out to the blossoms. ----
    vec2 ft = f + drift * 0.035 * smoothstep(0.2, 1.4, length(f - light));
    vec3 tree = picture(uTree, uTreeBase, light, uTreeScale, ft);
    vec2 fromRoot = (f - light) / uTreeScale;
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
    colour += uTint * star * pulse * ease(uBeamIn) * smoothstep(0.35, 0.75, uPan) * (1.0 - smoothstep(0.5, 1.0, uGrow) * 0.8);

    gl_FragColor = vec4(colour, 1.0);
  }
`;

const keys = ["beamIn", "pan", "settle", "grow", "beamOut", "dim"] as const;
type Key = (typeof keys)[number];

/**
 * Creation. Drawn across the whole screen in front of the world: the burst
 * gathers into a river of light, the frame glides along it to the star at its
 * tip, the star sinks and takes root, and the tree grows out of it.
 */
export function Creation() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const [textures, setTextures] = useState<THREE.Texture[] | null>(null);
  const motion = useRef<{
    ready: boolean;
    value: Record<Key, number>;
    speed: Record<Key, { v: number }>;
  }>(null);

  useEffect(() => {
    let alive = true;
    let made: THREE.Texture[] = [];
    Promise.all([creation.beam, creation.ribbon, creation.tree].map(loadImage))
      .then((images) => {
        if (!alive) return;
        made = images.map((image) => {
          const texture = new THREE.Texture(image);
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = 4;
          texture.needsUpdate = true;
          return texture;
        });
        setTextures(made);
      })
      .catch(() => {
        // Without the pictures the scene stays dark and the text carries it.
      });
    return () => {
      alive = false;
      made.forEach((t) => t.dispose());
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
      uRootY: { value: -0.5 },
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
      value: { beamIn: 0, pan: 0, settle: 0, grow: 0, beamOut: 0, dim: 0 },
      speed: {
        beamIn: { v: 0 },
        pan: { v: 0 },
        settle: { v: 0 },
        grow: { v: 0 },
        beamOut: { v: 0 },
        dim: { v: 0 },
      },
    });
    const dt = Math.min(delta, 1 / 20);
    const { progress, reducedMotion, work } = useStore.getState();
    // Each move follows the scroll with weight, so a fast scroll cannot snap it.
    for (const key of keys) {
      let goal = THREE.MathUtils.smoothstep(progress, ...creation.over[key]);
      // The tree also rests while the Work chapter plays in front of it.
      if (key === "dim")
        goal = Math.max(goal, THREE.MathUtils.smoothstep(work, 0.01, 0.08));
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
    m.ready = true;
    u.uBeam.value = textures[0];
    u.uRibbon.value = textures[1];
    u.uTree.value = textures[2];
    u.uBeamIn.value = m.value.beamIn;
    u.uPan.value = m.value.pan;
    u.uSettle.value = m.value.settle;
    u.uGrow.value = m.value.grow;
    u.uBeamOut.value = m.value.beamOut;
    u.uDim.value = m.value.dim;
    const aspect = state.size.width / state.size.height;
    u.uAspect.value = aspect;
    // The tree fills a wide screen and is drawn smaller on a tall one, so its crown still fits.
    const scale = THREE.MathUtils.clamp(
      creation.treeFit * aspect,
      creation.treeScale[0],
      creation.treeScale[1],
    );
    u.uTreeScale.value = scale;
    // Root the tree so that the whole of it sits centred on the screen.
    u.uRootY.value = (creation.treeBase[1] - 0.5) * scale + creation.treeLift;
    u.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime;
    mesh.visible = m.value.beamIn > 0.001;
  });

  if (!textures) return null;

  return (
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
  );
}
