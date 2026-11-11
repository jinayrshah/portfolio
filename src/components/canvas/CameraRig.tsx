"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { smoothDamp } from "@/lib/spring";
import { useStore } from "@/lib/store";
import { cameraGoal } from "@/motion/director";
import { cameraFeel as feel } from "@/motion/timeline";

function createRig() {
  return {
    goalPos: new THREE.Vector3(),
    goalTarget: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    target: new THREE.Vector3(),
    prevPos: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    offset: new THREE.Vector3(),
    fov: 38,
    roll: 0,
    px: 0,
    py: 0,
    started: false,
    s: {
      x: { v: 0 },
      y: { v: 0 },
      z: { v: 0 },
      tx: { v: 0 },
      ty: { v: 0 },
      tz: { v: 0 },
      fov: { v: 0 },
      roll: { v: 0 },
      px: { v: 0 },
      py: { v: 0 },
    },
  };
}

/**
 * A camera with weight. Scroll decides where it wants to be; springs move it
 * there, so it lags, catches up and settles like a real operator would.
 */
export function CameraRig() {
  const rigRef = useRef<ReturnType<typeof createRig>>(null);

  useFrame((state, delta) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const rig = (rigRef.current ??= createRig());

    const dt = Math.min(delta, 1 / 20);
    const { progress, pointer, reducedMotion } = useStore.getState();
    const goalFov = cameraGoal(progress, rig.goalPos, rig.goalTarget);

    if (!rig.started || reducedMotion) {
      // First frame, or reduced motion: no travel lag, no physical extras.
      rig.pos.copy(rig.goalPos);
      rig.target.copy(rig.goalTarget);
      rig.prevPos.copy(rig.pos);
      rig.fov = goalFov;
      rig.started = true;
    } else {
      const s = rig.s;
      rig.pos.set(
        smoothDamp(rig.pos.x, rig.goalPos.x, s.x, feel.positionSmoothTime, dt),
        smoothDamp(rig.pos.y, rig.goalPos.y, s.y, feel.positionSmoothTime, dt),
        smoothDamp(rig.pos.z, rig.goalPos.z, s.z, feel.positionSmoothTime, dt),
      );
      rig.target.set(
        smoothDamp(
          rig.target.x,
          rig.goalTarget.x,
          s.tx,
          feel.targetSmoothTime,
          dt,
        ),
        smoothDamp(
          rig.target.y,
          rig.goalTarget.y,
          s.ty,
          feel.targetSmoothTime,
          dt,
        ),
        smoothDamp(
          rig.target.z,
          rig.goalTarget.z,
          s.tz,
          feel.targetSmoothTime,
          dt,
        ),
      );
    }

    // Velocity drives the lens and the bank.
    rig.velocity
      .copy(rig.pos)
      .sub(rig.prevPos)
      .divideScalar(Math.max(dt, 1e-4));
    rig.prevPos.copy(rig.pos);
    rig.forward.copy(rig.target).sub(rig.pos).normalize();
    rig.right.crossVectors(rig.forward, rig.up).normalize();

    let fovGoal = goalFov;
    let rollGoal = 0;
    if (!reducedMotion) {
      const speed = rig.velocity.length();
      fovGoal += Math.min(feel.speedFovMax, speed * feel.speedFov);
      const sideways = rig.velocity.dot(rig.right);
      rollGoal = THREE.MathUtils.clamp(
        -sideways * feel.bank,
        -feel.bankMax,
        feel.bankMax,
      );
    }
    rig.fov = smoothDamp(rig.fov, fovGoal, rig.s.fov, feel.fovSmoothTime, dt);
    rig.roll = smoothDamp(rig.roll, rollGoal, rig.s.roll, 0.6, dt);

    // Cursor parallax and handheld breath, both small and both springy.
    rig.offset.set(0, 0, 0);
    if (!reducedMotion) {
      rig.px = smoothDamp(
        rig.px,
        pointer.x,
        rig.s.px,
        feel.parallaxSmoothTime,
        dt,
      );
      rig.py = smoothDamp(
        rig.py,
        pointer.y,
        rig.s.py,
        feel.parallaxSmoothTime,
        dt,
      );
      // Scale with distance so the effect stays subtle in close-ups.
      const reach = Math.min(1, rig.pos.distanceTo(rig.target) / 6);
      const t = state.clock.elapsedTime * feel.breathSpeed * Math.PI * 2;
      const bx = Math.sin(t) * 0.6 + Math.sin(t * 2.3 + 1.7) * 0.4;
      const by = Math.sin(t * 1.3 + 0.9) * 0.6 + Math.sin(t * 2.9) * 0.4;
      rig.offset
        .addScaledVector(
          rig.right,
          (rig.px * feel.parallax + bx * feel.breathAmplitude) * reach,
        )
        .addScaledVector(
          rig.up,
          (rig.py * feel.parallax + by * feel.breathAmplitude) * reach,
        );
    }

    camera.position.copy(rig.pos).add(rig.offset);
    camera.up.set(0, 1, 0);
    camera.lookAt(rig.target);
    camera.rotateZ(rig.roll);
    if (Math.abs(camera.fov - rig.fov) > 0.01) {
      camera.fov = rig.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
