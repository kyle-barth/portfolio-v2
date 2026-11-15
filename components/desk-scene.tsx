'use client';

import { useEffect, useRef } from 'react';
import type { Job, Person, Project } from '@/data/content';
import { projectBus } from '@/lib/scene/project-bus';

type Props = { person: Person; jobs: Job[]; projects: Project[] };
type SceneHandle = ReturnType<typeof import('@/lib/scene/after-hours').createAfterHours>;

/**
 * Bring the page in: layout.tsx marks the document as booting before its first paint, the CSS keeps the
 * page off-stage while it does, and this hands it the entrance. The attribute is cleared once the
 * entrance has run, so nothing lingers in the cascade.
 */
function reveal() {
  const html = document.documentElement;
  if (html.dataset.boot !== 'on') return;
  html.dataset.boot = 'done';
  const slow = Number(getComputedStyle(html).getPropertyValue('--slow')) || 1;
  window.setTimeout(() => { delete html.dataset.boot; }, 1800 * slow);
}

/**
 * The fixed 3D desk behind the page. three.js is imported after hydration, so the text is in the HTML
 * first and the scene code ships in its own chunk. Until the scene's monitor is on screen, a prompt
 * stands in for it; the page itself comes in once the camera has pulled back from the monitor.
 */
export default function DeskScene({ person, jobs, projects }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bootRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let scene: SceneHandle | null = null;
    let unsubscribe = () => {};
    const canvas = canvasRef.current, bootEl = bootRef.current, note = noteRef.current, tip = tipRef.current;
    if (!canvas || !bootEl || !note || !tip) return;
    // the stand-in goes as the page comes in, in case the 3D monitor never took over from it
    const revealAll = () => { bootEl.classList.add('gone'); reveal(); };
    const fail = (message: string) => { note.textContent = message; revealAll(); };
    const params = new URLSearchParams(window.location.search);
    const debug = process.env.NODE_ENV !== 'production' || params.has('debug');
    const slowAt = debug ? Number(params.get('slow')) || 1 : 1;
    // never hold the page back for long, whatever happens to the scene; the clock only runs while the
    // page is on screen, since a background tab draws no frames to build the desk with
    let safety = 0, safetyOn = true;
    const arm = () => {
      clearTimeout(safety);
      if (safetyOn && document.visibilityState === 'visible') safety = window.setTimeout(revealAll, 15000 / slowAt);
    };
    const standDown = () => { safetyOn = false; clearTimeout(safety); document.removeEventListener('visibilitychange', arm); };
    arm();
    document.addEventListener('visibilitychange', arm);

    // ?lab=<model>: one prop on its own in studio light instead of the desk (a separate, on-demand chunk)
    const lab = params.get('lab');
    if (lab) {
      let handle: { dispose(): void } | null = null;
      standDown();
      revealAll();
      import('@/lib/scene/lab')
        .then(({ createLab }) => createLab(lab))
        .then((h) => { if (cancelled) h.dispose(); else handle = h; })
        .catch((err: Error) => { note.textContent = err.message; });
      return () => { cancelled = true; handle?.dispose(); };
    }

    const bootStart = performance.now();
    import('@/lib/scene/after-hours')
      .then(({ createAfterHours }) => {
        if (cancelled) return;
        try {
          scene = createAfterHours({
            canvas,
            sections: Array.from(document.querySelectorAll<HTMLElement>('[data-stage]')),
            boot: { root: bootEl, note },
            bootStart,
            onReveal: () => { standDown(); reveal(); },
            reduceMotion: debug && params.get('motion') === 'full' ? false : undefined,
            tip,
            monoFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim(),
            person,
            jobs,
            projects,
            initialProject: projectBus.get(),
          });
        } catch {
          fail('WebGL is turned off in this browser, so the desk stays dark.');
          return;
        }
        unsubscribe = projectBus.subscribe((i) => scene?.selectProject(i));
        // ?debug: drive the scene by hand from the console (step frames, try camera shots)
        if (debug) {
          // __slow(f) / ?slow=f: the scene clock and the page's CSS transitions at f times speed, to check
          // motion. Whoever drives it from the console is in charge of the reveal too, so the net stands down.
          const slowDown = (f: number) => { scene?.slow(f); document.documentElement.style.setProperty('--slow', String(1 / f)); };
          Object.assign(window, { __step: scene.step, __setShot: scene.setShot, __state: scene.state, __slow: (f = 0.25) => { slowDown(f); standDown(); } });
          if (slowAt !== 1) slowDown(slowAt);
        }
      })
      .catch(() => {
        if (!cancelled) fail('The 3D desk could not load. Everything else still works.');
      });

    return () => {
      cancelled = true;
      standDown();
      unsubscribe();
      scene?.dispose();
    };
  }, [person, jobs, projects]);

  return (
    <>
      <canvas id="gl" ref={canvasRef} aria-hidden="true" />
      <div className="shade" />
      {/* the monitor's first frame, in place, until three.js is here to draw the rest of the boot log */}
      <div className="boot" ref={bootRef} aria-hidden="true">
        <div className="boot-screen">
          <div className="boot-bar"><span /><span /><span /><em>zsh  ~/kyle-barth.dev</em></div>
          <p><b>$</b>./after-hours --lights-off<i /></p>
        </div>
      </div>
      <p className="boot-note" ref={noteRef} role="status" />
      <div className="tip" ref={tipRef} />
    </>
  );
}
