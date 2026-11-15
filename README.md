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
- `lib/scene/props/`: every prop, built in code from primitives, apart from the MacBook (one 1.4 MB model file).
  `index.ts` lays out the desk and merges the static parts by material, so the whole desk draws in a few calls.
  - `desk.ts` (white standing desk, and a mat printed with liquid marble), `monitor.ts` (27" OLED on a V-shaped stand), `keyboard.ts`
    (Rama U80-A in Milk: solid top case with a cutout per key cluster, sculpted keycaps), `mouse.ts`
    (Sora V2, one sculpted shell), `macbook.ts` (loads `public/models/macbook-pro-14.glb` and corrects
    it against photos of the real one: Space Black, full-height function row, keyboard and trackpad
    moved forward, ports redrawn where they really are, thumb scoop, feet, the site's terminal on the
    screen; the scene waits up to 6 s for it, then uses a simple built-in laptop instead),
    `pc.ts` (Cooler Master NR200P), `chair.ts` (Secretlab
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
- `lib/scene/specs/`: measured specs (millimetres, with sources) that the printer and the lava lamp are
  built from, plus the dimension checks and reference-image calibrations the lab uses.
- `lib/scene/geometry.ts`: merge-by-material and teardown helpers.

## Notes

- The page opens on the boot sequence. Before any JavaScript runs, `app/layout.tsx` marks the document
  as booting, and the CSS holds the page back and shows the monitor's first frame as HTML. It sits at the
  exact size and place the 3D monitor will take, in the colours the scene renders it at. Once three.js
  is here, the 3D monitor takes over and runs a live boot log of what is loading: the script size, the
  desk going up a prop at a time, the MacBook download, and shader compiles. When everything has loaded,
  the lamp comes on and the camera pulls back from the monitor to the shot for the section in view. Only
  then does the page come in: the heading, its lines, then the nav, on small staggered delays. With
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
- Add `?lab=keyboard` (or `macbook`, `macbook-built`, `printer`, `printer-bare`, `chair`, `lava`,
  `tableware`) to see one prop on its own in studio light, for checking it against product photos
  (`lib/scene/lab.ts`, loaded only on that URL). `__labView(i)` jumps to a fixed view;
  `__labCapture('v1')` renders six views and a hero shot and posts them as PNGs to a local receiver on
  `?save=<port>` (default 8799). For props with a spec, `__labCheck()` lists every spec'd dimension
  measured off the built parts, and `__labOverlay('side', 'v1')` lines the model up with a straight-on
  reference image (fetched from the same receiver, so the images stay out of the repo) and reports the
  outline overlap (IoU), with a sheet of the photo with the model's edges, the outline difference and a
  blend.

## Credits

- MacBook Pro 14-inch model: ["Macbook-pro-14 inch"](https://sketchfab.com/3d-models/macbook-pro-14-inch-cc4c925785e548a8ab54ff6aac781bc7)
  by DPM, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Changed here (in code, at
  load time; the file itself is as downloaded): recoloured to Space Black, function row made full height,
  keyboard and trackpad moved forward, ports redrawn, thumb scoop and feet added, notch widened, bezel
  lettering removed, screen content replaced. The credit also shows in the site's footer (from
  `modelCredits` in `data/content.ts`).
