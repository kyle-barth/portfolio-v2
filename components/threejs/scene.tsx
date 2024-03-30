import { OrbitControls, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useContext, useEffect } from "react";
import { createPortal } from "react-dom";
import { Model } from "./model";
import { SceneContext } from "./scene-context";

function Loader() {
  const { progress } = useProgress();
  const { setLoaded } = useContext(SceneContext);

  useEffect(() => {
    if (progress === 100) {
      setLoaded(true);
    }
  }, [progress]);

  return createPortal(
    <div className="flex flex-col">
      <p className="text-2xl font-bold">{Math.round(progress)}% loaded</p>

      <span
        className="bg-white h-1 rounded-full"
        style={{ width: `${Math.round(progress)}%` }}
      />
    </div>,
    document.getElementById("loader") as HTMLDivElement
  );
}

export default function Scene() {
  return (
    <Suspense fallback={<Loader />}>
      <Canvas camera={{ position: [0, 35, 15] }}>
        <ambientLight />
        <Model />
        <OrbitControls autoRotate />
      </Canvas>
    </Suspense>
  );
}
