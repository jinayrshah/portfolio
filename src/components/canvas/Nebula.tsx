"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { lightColour } from "@/motion/director";

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColour;
  uniform float uTime;
  varying vec3 vDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + 11.7;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    float t = uTime * 0.006;
    float clouds = fbm(d * 2.2 + vec3(t, -t * 0.6, t * 0.4));
    float wisps = fbm(d * 5.0 - vec3(t * 1.4, 0.0, t));
    float mask = smoothstep(0.48, 0.82, clouds) * (0.55 + 0.45 * wisps);

    // Near-black with a blue cast, never pure black.
    vec3 base = vec3(0.016, 0.019, 0.034);
    vec3 colour = base + uColour * mask * 0.085;

    // Fine grain hides banding in the dark gradients.
    float grain = hash(d * 913.0 + uTime) - 0.5;
    colour += grain * 0.012;
    gl_FragColor = vec4(colour, 1.0);
  }
`;

/** The far background: faint clouds drawn by a shader, tinted by the act. */
export function Nebula() {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uColour: { value: new THREE.Color() }, uTime: { value: 0 } }),
    [],
  );

  useFrame((state) => {
    const { progress, reducedMotion } = useStore.getState();
    mesh.current?.position.copy(state.camera.position);
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime;
    lightColour(progress, u.uColour.value);
  });

  return (
    <mesh ref={mesh} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[500, 48, 32]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
