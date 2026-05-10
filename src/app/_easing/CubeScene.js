"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { sampleY } from "./bezier";

// Must match Graph.js so the loop stays in phase.
const HOLD_BEFORE_FADE = 400;
const FADE_DURATION = 200;
const PAUSE_AFTER_FADE = 300;

useGLTF.preload("/models/raspberry.glb");

function Strawberry({ samplesRef, duration, animStartRef }) {
  const groupRef = useRef(null);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const { scene } = useGLTF("/models/raspberry.glb");

  const pinkScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      if (node.isMesh) {
        node.material = node.material.clone();
        node.material.color.set("#f0899c");
      }
    });
    return clone;
  }, [scene]);

  useFrame(() => {
    if (!groupRef.current) return;
    const now = performance.now();
    const dur = durationRef.current;
    const cycle = dur + HOLD_BEFORE_FADE + FADE_DURATION + PAUSE_AFTER_FADE;
    const elapsed = (now - animStartRef.current) % cycle;
    const progress = Math.min(1, elapsed / dur);
    const v = sampleY(samplesRef.current, progress);

    groupRef.current.rotation.y = v * Math.PI * 2;
  });

  return (
    <group ref={groupRef}>
      <primitive object={pinkScene} />
    </group>
  );
}

export default function CubeScene({ samplesRef, duration, animStartRef }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.2], fov: 38 }}
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 5, 3]} intensity={3} />
      <directionalLight position={[-3, -2, -2]} intensity={0.8} />
      <Strawberry samplesRef={samplesRef} duration={duration} animStartRef={animStartRef} />
    </Canvas>
  );
}
