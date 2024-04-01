"use client";

import { Loader, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Model } from "./model";

export default function Scene() {
  return (
    <div className="top-0 left-0 w-screen h-screen">
      <Canvas camera={{ position: [0, 35, 15] }}>
        <Suspense fallback={null} />
        <ambientLight />
        <Model />
        <OrbitControls autoRotate />
      </Canvas>
      <Loader />
    </div>
  );
}
