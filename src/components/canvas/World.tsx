"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { tierSettings } from "@/lib/device";
import { useStore } from "@/lib/store";
import { CameraRig } from "./CameraRig";
import { DustField } from "./DustField";
import { GuideLight } from "./GuideLight";
import { Nebula } from "./Nebula";
import { Soul } from "./Soul";

/** Tells the loader when the first real frame has been drawn. */
function FirstFrame() {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    useStore.setState({ canvasReady: true });
  });
  return null;
}

/** The single 3D world the whole film takes place in. */
export default function World() {
  const tier = useStore((s) => s.tier);
  const settings = tierSettings[tier];

  return (
    <Canvas
      className="world"
      dpr={[1, settings.dpr]}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        alpha: false,
      }}
      camera={{ fov: 38, near: 0.05, far: 1200, position: [0, 0.4, 11] }}
      aria-hidden
    >
      <color attach="background" args={["#020203"]} />
      <CameraRig />
      <Nebula />
      <DustField count={settings.dust} />
      <Soul count={settings.soul} />
      <GuideLight />
      <FirstFrame />
    </Canvas>
  );
}
