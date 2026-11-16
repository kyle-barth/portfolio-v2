# kyle-barth.dev

My portfolio: one page, with my desk rendered in Three.js behind it at night. Scrolling glides the camera
between four shots (intro, projects, experience, contact), the monitor shows whichever project is picked,
a lava lamp switches on as the page opens, and a Bambu Lab P2S prints in the corner.

## Run it

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build && pnpm start
```

## Where things live

- `data/content.ts`: every word on the page, the job history and the project list (Garage is featured first).
- `app/page.tsx`: the page markup, rendered on the server so the text is there before any WebGL.
- `components/desk-scene.tsx`: mounts the 3D scene after hydration; three.js ships in its own chunk.
- `lib/scene/after-hours.ts`: the scene itself: lights, camera shots and glides, the monitor and laptop screens, hotspots.
- `lib/scene/props/`: every prop, built in code from primitives; no model files.
  `index.ts` lays out the desk and merges the static parts by material, so the whole desk draws in a few calls.
  - `desk.ts` (white standing desk, and a mat printed with liquid marble), `monitor.ts` (Gigabyte AORUS FO27Q3, from its measured spec: the thin
    QD-OLED panel and its chin, the faceted housing and light strip, and the leaning pillar on its
    two-legged base, the head slid down to the desk's height), `keyboard.ts`
    (Rama U80-A in Milk: solid top case with a cutout per key cluster, sculpted keycaps), `mouse.ts`
    (Ninjutso Sora V2 in white, from its measured spec: one shell over the measured plan and profile, with
    the section fitted to where its splits run, the nose undercut and tail chamfer, wheel, side buttons,
    logos, and skates traced off the underside), `macbook.ts` (MacBook Pro 14-inch with the PROLED XDR display, in
    Space Black, from its measured spec: the base and lid are lofted from the edge profile measured off
    Apple's renders, with the finger scoop cut into the front edge; the 78 keys where they measure, with
    their legends and function-row icons, the trackpad, grilles, ports with MagSafe's pins, intake slots,
    feet, Dynamic Island, and the site's terminal on the panel),
    `pc.ts` (Cooler Master NR200P MAX V2 in grey, from its measured spec: the front cover with its
    rounded edges and badge, a black top with its mesh and recessed I/O tray, and the right panel cut
    with all 414 holes of its Ncore pattern, generated from a rule fitted to the build guide's drawing), `chair.ts` (Secretlab
    TITAN Evo: padded parts built as cushions, with the Evo's arched head, wings and tone-on-tone panel),
    `snorlax.ts` (blocky Snorlax), `pothos.ts`, `tableware.ts` (coffee in a hand-thrown mug on a walnut
    coaster in front of the printer, and a donut on a matching plate; both in a reactive indigo glaze that
    breaks to amber at the rims, painted procedurally).
  - `night-env.ts`: a small night-room environment for reflections, given only to materials marked
    `reflective()` (metal, glass, glaze), so the rest of the room keeps its lighting.
  - `lava-lamp.ts`: the classic 14.5" Lava lamp, turned from profiles measured off Lava's own side-on
    drawing. The wax is a marching-cubes metaball field rebuilt every frame and faded out just inside the
    glass, so it never passes through it; the bottle, wax and glass are self-lit (matcaps and
    vertex-coloured glow), and its light is the scene's key light.
- `lib/scene/p2s.ts`: the P2S and AMS 2 Pro, printing a tiny garage.
- `lib/scene/specs/`: measured specs (millimetres, with sources) that the printer, the lava lamp, the
  MacBook, the mouse, the PC and the monitor are built from, plus the dimension checks and reference-image calibrations the lab uses.
- `lib/scene/geometry.ts`: merge-by-material and teardown helpers.

## Notes

- The page opens on the boot sequence. Before any JavaScript runs, `app/layout.tsx` marks the document
  as booting, and the CSS holds the page back and fades in the monitor's first frame as HTML. It sits at
  the exact size and place the 3D monitor will take (the camera square on, level with the screen), in
  the colours the scene renders it at, measured off the canvas. Once three.js is here and the fade has
  finished, the 3D monitor takes over in the dark, running a live boot log of what is loading: the
  script size, then the desk going up a prop at a time (out of sight, all but the desk itself and the
  lava lamp). Then the lamp switches on, flickering, and the room comes up round the monitor. It warms
  up with nothing else running: building, merging or compiling holds frames, which would stutter the
  lamp. The shaders compile once it is warm, the rest of the desk dissolves in (a still of the last
  frame laid over the canvas and faded out, hiding the frame its textures upload in), and the camera
  pulls back to the shot for the section in view, the exposure opening up as it goes. Only then does the page come in: the heading, its lines, then the nav, on small staggered
  delays. With
  reduced motion on, the pull-back still plays, over the same 2.4 s on a gentler sine ease (well under
  half the top speed), and the page only fades in. If the scene stalls, the page is shown anyway after
  15 seconds on screen.
- Every shader is compiled before the camera moves, a few at a time while the log runs, and the desk
  stays out of sight (an empty layer mask, lights included) until they are ready. Otherwise the first
  frame that draws something compiles its shader on the spot, and the boot log freezes or the pull-back
  stutters. With bloom, the scene renders into the renderer's half-float buffer, so shaders are compiled
  against a render target like it (`precompile` in `after-hours.ts`). The lamp's shadow pass is covered
  the same way.
- The camera glides to the next shot on a timed ease whenever the section in view changes, so scroll speed
  never makes it jump. With reduced motion on, the glide is shorter and gentler, and the lamp flicker and
  pointer parallax are off.
- With a mouse or pen, click and drag the desk to turn the camera around the current shot (up to side-on,
  never behind the wall). Five seconds after letting go, or as soon as the section changes, it eases back
  to the shot. Touch is left alone so it still scrolls the page, and the hint is hidden on touch screens.
- Bloom runs on larger screens only; phones also rebuild the lava wax every other frame.
- Add `?debug` to the URL to get `__step(n)` (advance n frames) and `__setShot(i, shot, phone?)` (try a
  camera shot) in the console. Handy when tuning framing, or when a background tab is not painting.
  `__slow(f)` (or `&slow=0.2`) runs the scene clock and the page's entrance at f times speed, to check
  motion. `__slow(0.0001)` then `__step(n)` steps through the boot frame by frame. `&motion=full` runs
  the scene as if reduced motion were off, even when the OS asks for it. `__state()` reports the boot phase, the log
  and the camera.
- Add `?lab=keyboard` (or `macbook`, `macbook-closed`, `mouse`, `pc`, `monitor`, `printer`, `printer-bare`, `chair`, `lava`,
  `tableware`) to see one prop on its own in studio light, for checking it against product photos
  (`lib/scene/lab.ts`, loaded only on that URL). `__labView(i)` jumps to a fixed view;
  `__labCapture('v1')` renders six views, a hero shot and a view from below and posts them as PNGs to a local receiver on
  `?save=<port>` (default 8799). For props with a spec, `__labCheck()` lists every spec'd dimension
  measured off the built parts, and `__labOverlay('side', 'v1')` lines the model up with a straight-on
  reference image (fetched from the same receiver, so the images stay out of the repo) and reports the
  outline overlap (IoU), with a sheet of the photo with the model's edges, the outline difference and a
  blend. References can be front, back, side (left or right) or top-down views, or a perspective render, for
  which the lab first searches for the camera (yaw, elevation, roll and lens) that lines the outlines up best.

