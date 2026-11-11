"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { lightColour } from "@/motion/director";

const BOX = 70;

const vertex = /* glsl */ `
  uniform vec3 uCamera;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uHeight;
  attribute float aSeed;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    // Slow drift, different for every speck.
    vec3 p = position;
    p.x += sin(uTime * 0.05 + aSeed * 40.0) * 1.2;
    p.y += uTime * (0.08 + aSeed * 0.12);
    p.z += cos(uTime * 0.04 + aSeed * 27.0) * 1.2;

    // Wrap the dust around the camera so the world never runs out of it.
    p = mod(p - uCamera + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)} + uCamera;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;
    gl_Position = projectionMatrix * mv;

    float size = mix(0.035, 0.11, fract(aSeed * 7.31));
    gl_PointSize = clamp(size * uHeight * uPixelRatio / max(dist, 0.001), 0.0, 42.0 * uPixelRatio);

    // Fade in from the far wall, and soften specks that drift right past the lens.
    float far = 1.0 - smoothstep(${(BOX * 0.3).toFixed(1)}, ${(BOX * 0.5).toFixed(1)}, dist);
    float near = smoothstep(0.3, 2.5, dist);
    float twinkle = 0.75 + 0.25 * sin(uTime * (0.4 + aSeed) + aSeed * 90.0);
    vAlpha = far * mix(0.25, 1.0, near) * twinkle;
    vSeed = aSeed;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColour;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float soft = smoothstep(0.5, 0.0, d);
    vec3 colour = mix(vec3(1.0), uColour, 0.35 + 0.5 * fract(vSeed * 3.7));
    gl_FragColor = vec4(colour, soft * soft * vAlpha * 0.8);
  }
`;

/** Drifting dust in every direction: the depth layers the camera moves through. */
export function DustField({ count }: { count: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    // A fixed pseudo-random sequence, so the dust is identical on every visit.
    let s = 1234567;
    const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < count; i++) {
      positions[i * 3] = rand() * BOX;
      positions[i * 3 + 1] = rand() * BOX;
      positions[i * 3 + 2] = rand() * BOX;
      seeds[i] = rand();
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uCamera: { value: new THREE.Vector3() },
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uHeight: { value: 800 },
      uColour: { value: new THREE.Color() },
    }),
    [],
  );

  useFrame((state) => {
    const u = material.current?.uniforms;
    if (!u) return;
    const { progress, reducedMotion } = useStore.getState();
    u.uCamera.value.copy(state.camera.position);
    u.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime;
    u.uPixelRatio.value = state.gl.getPixelRatio();
    u.uHeight.value = state.size.height;
    lightColour(progress, u.uColour.value);
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
