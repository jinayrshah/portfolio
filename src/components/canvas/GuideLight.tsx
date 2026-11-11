"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { cameraGoal, figureHeight, lightColour } from "@/motion/director";

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColour;
  uniform float uPulse;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float core = smoothstep(0.16, 0.0, d);
    float halo = pow(max(0.0, 1.0 - d), 3.0);
    vec3 colour = mix(uColour, vec3(1.0), core);
    gl_FragColor = vec4(colour, (core + halo * 0.5) * uPulse);
  }
`;

/**
 * The one light the visitor follows through the whole film. In phase 1 it
 * stands in for the soul, the mind light, the beam and the tree's core.
 */
export function GuideLight() {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const scratch = useMemo(
    () => ({ p: new THREE.Vector3(), t: new THREE.Vector3() }),
    [],
  );
  const uniforms = useMemo(
    () => ({ uColour: { value: new THREE.Color() }, uPulse: { value: 1 } }),
    [],
  );

  useFrame((state) => {
    const m = mesh.current;
    const u = material.current?.uniforms;
    if (!m || !u) return;
    const { progress, reducedMotion } = useStore.getState();
    cameraGoal(progress, scratch.p, scratch.t);
    // While the soul is on screen the light is its heart: smaller and softer.
    // Afterwards it follows the camera's target along the rest of the path.
    const inSoul = 1 - THREE.MathUtils.smoothstep(progress, 0.3, 0.36);
    scratch.p.set(0, figureHeight(progress) + 0.48, 0.1);
    scratch.t.lerp(scratch.p, inSoul);
    m.position.copy(scratch.t);
    m.quaternion.copy(state.camera.quaternion);
    // Keep a steady apparent size, so it reads as a point of light at any range.
    const dist = state.camera.position.distanceTo(scratch.t);
    const size = THREE.MathUtils.lerp(0.16, 0.085, inSoul);
    m.scale.setScalar(THREE.MathUtils.clamp(dist * size, 0.12, 6));
    lightColour(progress, u.uColour.value);
    u.uPulse.value = reducedMotion
      ? 0.9
      : 0.86 + 0.14 * Math.sin(state.clock.elapsedTime * 0.9);
  });

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={5}>
      <planeGeometry args={[1, 1]} />
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
