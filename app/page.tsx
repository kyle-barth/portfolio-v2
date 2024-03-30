"use client";

import Loader from "@/components/loader";
import NavLink from "@/components/nav-link";
import Scene from "@/components/threejs/scene";
import { SceneContext } from "@/components/threejs/scene-context";
import { useState } from "react";

export default function Home() {
  const [loaded, setLoaded] = useState(false);

  return (
    <SceneContext.Provider value={{ loaded, setLoaded }}>
      <Scene />

      <main>
        <div className="h-1/2 sm:h-full w-full sm:w-1/2 top-1/2 sm:top-0 flex justify-end bg-blue-950 bg-opacity-40 absolute left-0 backdrop-filter backdrop-blur-md">
          <div className="sm:max-w-80 p-8 flex flex-col gap-10">
            <div className="flex flex-col gap-6">
              <h1 className="text-4xl font-extrabold">Welcome! 👋🏻</h1>
              <p>
                I'm Kyle, a senior web dev with 7+ years experience in Software
                Development.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:gap-0">
              <NavLink text="about" />
              <NavLink text="portfolio" />
            </div>
          </div>
        </div>
      </main>

      <Loader />
    </SceneContext.Provider>
  );
}
