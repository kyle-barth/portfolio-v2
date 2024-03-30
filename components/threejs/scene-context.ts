import { createContext } from "react";

export const SceneContext = createContext({ loaded: false, setLoaded: (loaded: boolean) => {}});
