import { useContext, useEffect, useState } from "react";
import { SceneContext } from "./threejs/scene-context";

export default function Loader() {
  const { loaded } = useContext(SceneContext);
  const [delay, setDelay] = useState(false);

  useEffect(() => {
    const div = document.getElementById("loader");

    if (loaded && div) {
      div.classList.add("opacity-0");
      setTimeout(() => {
        setDelay(true);
      }, 1000);
    }
  }, [loaded]);

  return (
    <>
      {!delay && (
        <div
          id="loader"
          className="transition-all duration-1000 absolute z-50 top-0 left-0 w-screen h-screen bg-black flex items-center justify-center"
        />
      )}
    </>
  );
}
