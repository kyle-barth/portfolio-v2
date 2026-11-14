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
  - `desk.ts` (white standing desk and mat), `monitor.ts` (27" OLED on a V-shaped stand), `keyboard.ts`
    (Rama U80-A in Milk: solid top case with a cutout per key cluster, sculpted keycaps), `mouse.ts`
    (Sora V2, one sculpted shell), `macbook.ts` (loads `public/models/macbook-pro-14.glb` and corrects
    it against photos of the real one: Space Black, full-height function row, keyboard and trackpad
    moved forward, ports redrawn where they really are, thumb scoop, feet, the site's terminal on the
    screen; the scene waits up to 6 s for it, then uses a simple built-in laptop instead),
    `pc.ts` (Cooler Master NR200P), `chair.ts` (Secretlab
    TITAN Evo: padded parts built as cushions, with the Evo's arched head, wings and tone-on-tone panel),
    `snorlax.ts` (blocky Snorlax), `pothos.ts`, `tableware.ts` (coffee on a walnut coaster, a donut on a plate).
  - `night-env.ts`: a small night-room environment for reflections, given only to materials marked
    `reflective()` (metal, glass, glaze), so the rest of the room keeps its lighting.
  - `lava-lamp.ts`: the wax is a marching-cubes metaball field rebuilt every frame; the bottle, wax and
    glass are self-lit (matcaps and vertex-coloured glow), and its light is the scene's key light.
- `lib/scene/p2s.ts`: the P2S and AMS 2 Pro, printing a tiny garage.
- `lib/scene/geometry.ts`: merge-by-material and teardown helpers.

## Notes

- The camera glides to the next shot on a timed ease whenever the section in view changes, so scroll speed
  never makes it jump. With reduced motion on, the glide is shorter and gentler, and the lamp flicker and
  pointer parallax are off.
- Bloom runs on larger screens only; phones also rebuild the lava wax every other frame.
- Add `?debug` to the URL to get `__step(n)` (advance n frames) and `__setShot(i, shot, phone?)` (try a
  camera shot) in the console. Handy when tuning framing, or when a background tab is not painting.
- Add `?lab=keyboard` (or `macbook`, `macbook-built`, `printer`, `chair`) to see one prop on its own in studio light, for
  checking it against product photos (`lib/scene/lab.ts`, loaded only on that URL). `__labView(i)` jumps
  to a fixed view; `__labCapture('v1')` renders six views and a hero shot and posts them as PNGs to a
  local receiver on `?save=<port>` (default 8799).

## Credits

- MacBook Pro 14-inch model: ["Macbook-pro-14 inch"](https://sketchfab.com/3d-models/macbook-pro-14-inch-cc4c925785e548a8ab54ff6aac781bc7)
  by DPM, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Changed here (in code, at
  load time; the file itself is as downloaded): recoloured to Space Black, function row made full height,
  keyboard and trackpad moved forward, ports redrawn, thumb scoop and feet added, notch widened, bezel
  lettering removed, screen content replaced. The credit also shows in the site's footer (from
  `modelCredits` in `data/content.ts`).
