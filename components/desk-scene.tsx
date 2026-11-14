'use client';

import { useEffect, useRef } from 'react';
import type { Job, Person, Project } from '@/data/content';
import { projectBus } from '@/lib/scene/project-bus';

type Props = { person: Person; jobs: Job[]; projects: Project[] };
type SceneHandle = ReturnType<typeof import('@/lib/scene/after-hours').createAfterHours>;

/**
 * The fixed 3D desk behind the page. three.js is imported after hydration, so the text
 * renders first and the scene code ships in its own chunk.
 */
export default function DeskScene({ person, jobs, projects }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let scene: SceneHandle | null = null;
    let unsubscribe = () => {};
    const canvas = canvasRef.current, root = loaderRef.current, bar = barRef.current, text = textRef.current, tip = tipRef.current;
    if (!canvas || !root || !bar || !text || !tip) return;

    // ?lab=<model>: one prop on its own in studio light instead of the desk (a separate, on-demand chunk)
    const lab = new URLSearchParams(window.location.search).get('lab');
    if (lab) {
      let handle: { dispose(): void } | null = null;
      import('@/lib/scene/lab')
        .then(({ createLab }) => createLab(lab))
        .then((h) => { if (cancelled) h.dispose(); else { handle = h; root.classList.add('done'); } })
        .catch((err: Error) => { text.textContent = err.message; });
      return () => { cancelled = true; handle?.dispose(); };
    }

    import('@/lib/scene/after-hours')
      .then(({ createAfterHours }) => {
        if (cancelled) return;
        try {
          scene = createAfterHours({
            canvas,
            sections: Array.from(document.querySelectorAll<HTMLElement>('[data-stage]')),
            loader: { root, bar, text },
            tip,
            monoFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim(),
            person,
            jobs,
            projects,
            initialProject: projectBus.get(),
          });
        } catch {
          text.textContent = 'WebGL is turned off in this browser, so the desk stays dark.';
          return;
        }
        unsubscribe = projectBus.subscribe((i) => scene?.selectProject(i));
        // ?debug: drive the scene by hand from the console (step frames, try camera shots)
        if (process.env.NODE_ENV !== 'production' || new URLSearchParams(window.location.search).has('debug')) {
          Object.assign(window, { __step: scene.step, __setShot: scene.setShot });
        }
      })
      .catch(() => {
        if (!cancelled) text.textContent = 'The 3D desk could not load. Everything else still works.';
      });

    return () => {
      cancelled = true;
      unsubscribe();
      scene?.dispose();
    };
  }, [person, jobs, projects]);

  return (
    <>
      <canvas id="gl" ref={canvasRef} aria-hidden="true" />
      <div className="shade" />
      <div className="loader" ref={loaderRef}>
        <b ref={barRef} />
        <small ref={textRef}>Switching on the desk lamp</small>
      </div>
      <div className="tip" ref={tipRef} />
    </>
  );
}
