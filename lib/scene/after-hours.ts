// The After Hours scene: Kyle's desk at night, lit by a lava lamp that switches on as the page opens.
// It boots: the monitor is built first, close up, running a terminal that reports what is
// loading (three.js, the desk prop by prop, the MacBook file, the shaders). When all of it is ready the
// lava lamp flickers on and the camera pulls back from the monitor to the section's shot; only then is
// the page brought in (onReveal). After that, each section has a camera shot; when the section in view
// changes, the camera glides to the new shot on a timed ease (so scroll speed never makes it jump).
// Dragging with a mouse turns the camera around the shot, and it eases back after a few idle seconds.
// The monitor shows code, then the picked project, then contact details; in the experience section,
// where the camera turns to the laptop, the laptop runs a git log of jobs (otherwise a test run).
// createAfterHours() builds it and tears it down.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Job, Person, Project } from '@/data/content';
import { measureAnchors, stageAt } from '@/lib/scroll-stage';
import { disposeTree } from './geometry';
import { LAYOUT, MONITOR_SCREEN, buildBootSet, buildDeskScene } from './props';
import { MONITOR } from './props/monitor';
import { MACBOOK_SCREEN } from './props/macbook';
import { nightEnvironment } from './props/night-env';
import { MUG_RIM } from './props/tableware';
import { DESK } from './props/desk';

export type AfterHoursOptions = {
  canvas: HTMLCanvasElement;
  sections: HTMLElement[];
  /** The page's own boot prompt (shown until the monitor's first frame) and a line for errors. */
  boot: { root: HTMLElement; note: HTMLElement };
  /** performance.now() when the page started fetching the scene, to report the download. */
  bootStart: number;
  /** Called once, when the camera has pulled back from the monitor (or the desk could not start). */
  onReveal: () => void;
  tip: HTMLElement;
  monoFamily: string;
  person: Person;
  jobs: Job[];
  projects: Project[];
  initialProject?: number;
  /** Overrides the prefers-reduced-motion setting (debug: ?motion=full to check the flight on a machine that asks for less motion). */
  reduceMotion?: boolean;
};

type Vec3 = readonly [number, number, number];
type Shot = { t: THREE.Vector3; sph: THREE.Spherical; fov: number; sx: number; sy: number };
type CamState = { target: THREE.Vector3; radius: number; phi: number; theta: number; fov: number; sx: number; sy: number };
type Hotspot = { label: string; to: string | null };

// One shot per section: target, camera offset from the target, vertical fov, and a view offset
// (fraction of the screen) that pushes the subject away from the text panel.
const RAW_SHOTS: Record<'wide' | 'phone', readonly { t: Vec3; o: Vec3; fov: number; sx: number; sy: number }[]> = {
  wide: [
    { t: [0.3, 1.2, -0.4], o: [8.6, 5.8, 12.2], fov: 34, sx: 0.19, sy: 0.04 },
    { t: [0.25, 1.62, -1.5], o: [0.5, 0.45, 9.0], fov: 30, sx: 0.2, sy: 0 },
    { t: [-3.3, 1.0, -0.9], o: [3.6, 2.4, 5.6], fov: 32, sx: -0.2, sy: 0 }, // from the front-right: PC window, lamp, plant
    { t: [0, 0, 0.5], o: [0.01, 23, 4.5], fov: 34, sx: 0, sy: 0.24 }, // the whole desk from above, clear of the heading
  ],
  phone: [
    { t: [0.6, 1.5, -0.8], o: [7.0, 7.2, 17.0], fov: 46, sx: 0, sy: 0.2 }, // keeps the lava lamp in frame
    { t: [0.25, 1.68, -1.5], o: [0.35, 0.6, 10.8], fov: 44, sx: 0, sy: 0.27 },
    { t: [-3.3, 1.0, -0.9], o: [3.4, 3.4, 7.6], fov: 46, sx: 0, sy: 0.25 },
    { t: [0, 0, 0.6], o: [1.6, 20.5, 0.01], fov: 46, sx: 0, sy: 0.24 },
  ],
};

// What the monitor shows in each section. In the experience section the camera turns to the laptop, so
// that is where the career log plays (LAPTOP_LOG); the monitor keeps the code up behind the panel.
const MODES = ['code', 'project', 'code', 'contact'] as const;
const LAPTOP_LOG = 2;
type Mode = (typeof MODES)[number] | 'boot';
type Phase = 'boot' | 'flight' | 'live'; // the boot log, the pull-back from the monitor, then the page

const PHONE_QUERY = '(max-width: 760px), (max-aspect-ratio: 9/10)';
const easeOut = (k: number) => 1 - Math.pow(1 - k, 5); // close to cubic-bezier(0.23, 1, 0.32, 1)
// strong ease-in-out for on-screen movement, close to cubic-bezier(0.77, 0, 0.175, 1)
const easeInOut = (k: number) => (k < 0.5 ? 8 * k ** 4 : 1 - (-2 * k + 2) ** 4 / 2);
const easeInOutSine = (k: number) => (1 - Math.cos(Math.PI * k)) / 2;

export function createAfterHours(o: AfterHoursOptions) {
  const { canvas, sections, boot, tip, person, jobs, projects } = o;
  const reduce = o.reduceMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phoneQ = window.matchMedia(PHONE_QUERY);
  const MONO = o.monoFamily || 'ui-monospace, Menlo, monospace';
  const cleanups: (() => void)[] = [];
  const on = <K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions) => {
    window.addEventListener(type, fn, opts);
    cleanups.push(() => window.removeEventListener(type, fn));
  };
  let disposed = false;

  /* ---------- Scroll stage ---------- */
  let anchors = measureAnchors(sections);
  let stage = stageAt(anchors);
  let pointerDirty = false;
  on('scroll', () => { stage = stageAt(anchors); pointerDirty = true; }, { passive: true });
  // section positions move when fonts swap or content reflows, not only on window resize; and a
  // scrollbar coming or going changes the canvas's width without one
  const ro = new ResizeObserver(() => {
    if (document.documentElement.clientWidth !== W) resize();
    else { anchors = measureAnchors(sections); stage = stageAt(anchors); }
  });
  ro.observe(document.body);
  cleanups.push(() => ro.disconnect());

  /* ---------- Renderer: bloom on larger screens only (fill rate on phones) ---------- */
  const lowPower = phoneQ.matches;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    ...(lowPower ? {} : { outputBufferType: THREE.HalfFloatType }),
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.7;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true; // the 3D print is revealed by a clipping plane at the nozzle
  let bloom: UnrealBloomPass | null = null;
  if (!lowPower) {
    bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.45, 0.5, 1.2);
    renderer.setEffects([bloom]);
  }

  const scene = new THREE.Scene();
  const NIGHT = new THREE.Color('#070a12');
  scene.background = NIGHT;
  scene.fog = new THREE.FogExp2(NIGHT, 0.026);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 120);

  RectAreaLightUniformsLib.init();
  // The room's own light (moonlight, a cool fill) is dark until the lava lamp switches on, and comes up
  // with it: the boot opens on the screen alone in the dark, as the page's stand-in showed it.
  const hemi = new THREE.HemisphereLight('#7887c2', '#06070c', 0.7);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight('#7d93ff', 0.85);
  moon.position.set(-9, 8, -7);
  scene.add(moon);
  const fill = new THREE.DirectionalLight('#c9d6ff', 0.75); // cool fill from the right
  fill.position.set(9, 5, 6);
  scene.add(fill);
  const roomLights = [hemi, moon, fill].map((l) => [l, l.intensity] as const);
  const roomLevel = (k: number) => { for (const [l, full] of roomLights) l.intensity = full * k; };
  roomLevel(0);

  // a dark wall behind the desk, so the lava lamp and the screens have something to glow against
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), new THREE.MeshStandardMaterial({ color: '#161c2c', roughness: 0.95 }));
  wall.position.set(0, DESK.floor + 10, -3.1);
  wall.receiveShadow = true;
  wall.matrixAutoUpdate = false;
  wall.updateMatrix();
  scene.add(wall);

  const SCREEN_GLOW = new THREE.Color('#8fd3ff');
  const screenLight = new THREE.RectAreaLight('#8fd3ff', 0, 3.6, 2.0);
  screenLight.position.copy(MONITOR_SCREEN).add(new THREE.Vector3(0, 0, 0.04));
  screenLight.lookAt(MONITOR_SCREEN.x, MONITOR_SCREEN.y - 0.2, 6);
  scene.add(screenLight);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: '#0b0f1c', roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = DESK.floor - 0.01;
  floor.receiveShadow = true;
  floor.matrixAutoUpdate = false;
  floor.updateMatrix();
  scene.add(floor);

  /* ---------- Monitor + laptop screens (canvas textures) ---------- */
  const SW = 1024, SH = 576; // 16:9, like the OLED panel
  const newCanvas = (w = SW, h = SH) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // Screens are laid out in SW x SH units. The live screen (boot log, code, contact, a project's wipe)
  // is drawn at 1x: it redraws many times a second and each redraw is a texture upload. A project at
  // rest is a still, so it is drawn at SK times that, uploaded once, and shown in its place: on a
  // desk-sized window the panel spans about 1500 device pixels, and at 1x its screenshot goes soft.
  // Phones see the monitor smaller and keep 1x.
  const SK = lowPower ? 1 : 2;
  const screenCanvas = (k = 1) => {
    const c = newCanvas(SW * k, SH * k), x = c.getContext('2d')!;
    x.scale(k, k);
    x.imageSmoothingQuality = 'high';
    return [c, x] as const;
  };
  const screenTexture = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };
  const [scr, sx] = screenCanvas();
  const [snap, snapX] = screenCanvas();
  const scrTex = screenTexture(scr);
  const stillTex = screenTexture(newCanvas(1, 1)); // the project at rest, at SK x (see the loop)
  // the screens sit a hair in front of their bezels; pull them forward in depth so they never z-fight
  const ON_TOP = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
  const screenMat = new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false, ...ON_TOP });

  // the MacBook's panel, 1.52:1, laid out in 512-wide units and drawn at twice that: in the experience
  // shot it fills a third of the screen
  const LW = 512, LH = Math.round((LW * MACBOOK_SCREEN.h) / MACBOOK_SCREEN.w), LS = 2;
  const lap = newCanvas(LW * LS, LH * LS);
  const lx = lap.getContext('2d')!;
  lx.scale(LS, LS);
  const lapTex = new THREE.CanvasTexture(lap);
  lapTex.colorSpace = THREE.SRGBColorSpace;
  lapTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const lapMat = new THREE.MeshBasicMaterial({ map: lapTex, color: 0x000000, toneMapped: false, ...ON_TOP });

  const C = { bg: '#0a0f1f', bar: '#121a33', gutter: '#3a4566', fg: '#d8def0', mute: '#5d6787', key: '#ffb869', str: '#a7e3b8', prop: '#8fd3ff', num: '#f59fb1' };
  const codeLines: [string, string][][] = [
    [['c', '// kyle-barth.dev']],
    [['k', 'export const '], ['f', 'kyle'], ['p', ' = {']],
    [['f', '  role'], ['p', ': '], ['s', `"${person.shortRole}"`], ['p', ',']],
    [['f', '  based'], ['p', ': '], ['s', `"${person.location}"`], ['p', ',']],
    [['f', '  since'], ['p', ': '], ['n', String(person.since)], ['p', ',']],
    // wrapped: on one line it runs past the screen's right edge
    [['f', '  skills'], ['p', ': ['], ['s', '"agentic workflows"'], ['p', ', '], ['s', '"tests"'], ['p', ',']],
    [['p', '           '], ['s', '"experiments"'], ['p', ', '], ['s', '"alerts"'], ['p', '],']],
    [['f', '  building'], ['p', ': '], ['s', '"garage.chat"'], ['p', ',']],
    [['p', '};']],
  ];
  const tokColor: Record<string, string> = { c: C.mute, k: C.key, f: C.prop, p: C.fg, s: C.str, n: C.num };
  const codeLen = codeLines.reduce((n, l) => n + l.reduce((m, t) => m + t[1].length, 0) + 1, 0);

  let mode: Mode = 'boot', modeAt = -1, activeProject = o.initialProject ?? 0, projectAt = -10, dirty = true;
  let typed = 0;
  let time = 0;
  const WIPE = 0.24; // seconds

  /* ---------- Boot log: what is loading, live, on the monitor ---------- */
  // Lines appear in order, at least BOOT_GAP apart, so a cached load still reads as a sequence; each
  // shows a spinner and a live figure until its step is done.
  type BootLine = { label: string; detail: string; done: boolean; shownAt: number };
  const bootLines: BootLine[] = [];
  const BOOT_GAP = reduce ? 0.12 : 0.22;
  function bootLine(label: string, detail = '') {
    const l: BootLine = { label, detail, done: false, shownAt: -1 };
    bootLines.push(l);
    dirty = true;
    return {
      set(d: string) { if (!l.done) { l.detail = d; dirty = true; } },
      done(d = l.detail) { l.detail = d; l.done = true; dirty = true; },
    };
  }
  /** Every line is done and on screen, and the last has had a moment to be read. */
  const bootSettled = (t: number) => bootLines.length > 0 && bootLines.every((l) => l.done && l.shownAt >= 0) && t - bootLines[bootLines.length - 1].shownAt > BOOT_GAP * 2;
  const mb = (bytes: number) => (bytes / 1e6).toFixed(1);
  // three.js and the scene code arrived as scripts after bootStart: report how much came down
  {
    const kb = performance.getEntriesByType('resource')
      .filter((e) => (e as PerformanceResourceTiming).initiatorType === 'script' && e.startTime >= o.bootStart - 1)
      .reduce((n, e) => n + ((e as PerformanceResourceTiming).transferSize || (e as PerformanceResourceTiming).encodedBodySize || 0), 0) / 1024;
    bootLine(`three.js r${THREE.REVISION}`).done(kb > 1 ? `${Math.round(kb)} KB` : 'cached');
  }
  const deskLine = bootLine('building the desk');
  let lampLine: ReturnType<typeof bootLine> | null = null; // added when the lamp switches on

  // Each project's screen is rendered once into its own canvas, then wiped onto the monitor.
  const shots: ([HTMLImageElement, HTMLImageElement | null] | null)[] = projects.map(() => null);
  const screens: (HTMLCanvasElement | null)[] = projects.map(() => null);
  const glows: (THREE.Color | null)[] = projects.map(() => null);
  const loadImg = (src: string) => new Promise<HTMLImageElement | null>((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
  projects.forEach(async (p, i) => {
    const [a, b] = await Promise.all([loadImg(p.img), p.img2 ? loadImg(p.img2) : Promise.resolve(null)]);
    if (!a || disposed) return;
    shots[i] = [a, b];
    glows[i] = avgColor(a);
    screens[i] = null;
    dirty = true;
  });
  function avgColor(im: HTMLImageElement) {
    const c = newCanvas(8, 8);
    const x = c.getContext('2d', { willReadFrequently: true })!;
    x.drawImage(im, 0, 0, 8, 8);
    const d = x.getImageData(0, 0, 8, 8).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const col = new THREE.Color(r / 64 / 255, g / 64 / 255, b / 64 / 255);
    const hsl = { h: 0, s: 0, l: 0 };
    col.getHSL(hsl);
    return col.setHSL(hsl.h, Math.min(1, hsl.s + 0.25), 0.62);
  }

  function roundRect(x: CanvasRenderingContext2D, X: number, Y: number, w: number, h: number, r: number) {
    x.beginPath(); x.moveTo(X + r, Y);
    x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r);
    x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath();
  }
  function chrome(title: string, x = sx) {
    x.fillStyle = C.bar; x.fillRect(0, 0, SW, 46);
    ['#ff6b6b', '#ffcf5c', '#5ce08b'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(26 + i * 22, 23, 6.5, 0, 7); x.fill(); });
    x.fillStyle = C.bg; roundRect(x, 110, 11, SW - 220, 24, 12); x.fill();
    x.fillStyle = C.mute; x.font = `500 15px ${MONO}`; x.textAlign = 'center'; x.fillText(title, SW / 2, 28); x.textAlign = 'left';
  }
  function cursor(x: number, y: number, t: number) { if (Math.floor(t * 2) % 2 === 0) { sx.fillStyle = C.key; sx.fillRect(x, y - 22, 13, 28); } }
  const hostOf = (p: Project) => p.domain || p.href.replace(/^https?:\/\//, '').replace(/\/$/, '');

  function browserScreen(p: Project, im: HTMLImageElement) {
    const [c, x] = screenCanvas(SK);
    x.fillStyle = C.bg; x.fillRect(0, 0, SW, SH);
    const h = SH - 46, s = Math.max(SW / im.naturalWidth, h / im.naturalHeight);
    x.drawImage(im, (SW - im.naturalWidth * s) / 2, 46, im.naturalWidth * s, im.naturalHeight * s);
    chrome(hostOf(p), x);
    return c;
  }
  // A Windows app on a desktop, with a taskbar and a late-night clock: its main window large, and a
  // second (if it has one) smaller beside it, both standing on the same line.
  function desktopScreen(a: HTMLImageElement, b: HTMLImageElement | null) {
    const [c, x] = screenCanvas(SK);
    const g = x.createLinearGradient(0, 0, SW, SH); g.addColorStop(0, '#0b1a36'); g.addColorStop(1, '#1b4a7e');
    x.fillStyle = g; x.fillRect(0, 0, SW, SH);
    const rg = x.createRadialGradient(SW * 0.72, SH * 0.2, 0, SW * 0.72, SH * 0.2, SW * 0.6);
    rg.addColorStop(0, 'rgba(120,170,255,.28)'); rg.addColorStop(1, 'rgba(120,170,255,0)');
    x.fillStyle = rg; x.fillRect(0, 0, SW, SH);
    type Win = [HTMLImageElement, number]; // the window's screenshot and its height on the desktop
    const wins: Win[] = [];
    wins.push([a, 430]);
    if (b) wins.push([b, 360]);
    const base = 464, gap = 28; // the line the windows stand on
    const ww = ([im, wh]: Win) => im.naturalWidth * (wh / im.naturalHeight);
    let left = (SW - wins.reduce((n, w) => n + ww(w), 0) - gap * (wins.length - 1)) / 2;
    for (const w of wins) {
      const [im, wh] = w, top = base - wh;
      x.save(); x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 36; x.shadowOffsetY = 12;
      roundRect(x, left, top, ww(w), wh, 10); x.fillStyle = '#121721'; x.fill(); x.restore();
      x.save(); roundRect(x, left, top, ww(w), wh, 10); x.clip(); x.drawImage(im, left, top, ww(w), wh); x.restore();
      left += ww(w) + gap;
    }
    x.fillStyle = 'rgba(14,18,28,.94)'; x.fillRect(0, SH - 46, SW, 46);
    for (let i = 0; i < 5; i++) { x.fillStyle = i === 2 ? '#58a6ff' : 'rgba(220,230,255,.32)'; roundRect(x, SW / 2 - 110 + i * 46, SH - 36, 26, 26, 6); x.fill(); }
    x.fillStyle = '#58a6ff'; x.fillRect(SW / 2 - 110 + 2 * 46 + 7, SH - 6, 12, 3);
    x.fillStyle = '#d8def0'; x.font = `500 15px ${MONO}`; x.textAlign = 'right'; x.fillText('23:47', SW - 20, SH - 18); x.textAlign = 'left';
    return c;
  }
  function screenFor(i: number) {
    const s = shots[i];
    if (!screens[i] && s) screens[i] = projects[i].screen === 'desktop' ? desktopScreen(s[0], s[1]) : browserScreen(projects[i], s[0]);
    return screens[i];
  }

  function drawCode(t: number) {
    sx.fillStyle = C.bg; sx.fillRect(0, 0, SW, SH); chrome('kyle.ts  ~/kyle-barth.dev');
    sx.font = `500 25px ${MONO}`;
    let left = typed, y = 100;
    codeLines.forEach((line, li) => {
      sx.fillStyle = C.gutter; sx.fillText(String(li + 1).padStart(2, ' '), 26, y);
      let x = 86;
      for (const [k, txt] of line) {
        if (left <= 0) break;
        const s = txt.slice(0, left); left -= s.length;
        sx.fillStyle = tokColor[k]; sx.fillText(s, x, y); x += sx.measureText(s).width;
      }
      left -= 1;
      if ((left < 0 && left > -2) || (li === codeLines.length - 1 && typed >= codeLen)) cursor(x + 2, y, t);
      y += 54;
    });
  }
  function drawProject(t: number) {
    const e = easeOut(Math.min(1, (t - projectAt) / WIPE));
    // the snapshot is whatever was on screen when this pick arrived, so a new pick mid-wipe continues from there
    if (e < 1) sx.drawImage(snap, 0, 0, SW, SH); else { sx.fillStyle = C.bg; sx.fillRect(0, 0, SW, SH); }
    const src = screenFor(activeProject);
    if (src) { sx.save(); sx.beginPath(); sx.rect(0, 0, SW, SH * e); sx.clip(); sx.drawImage(src, 0, 0, SW, SH); sx.restore(); }
    else chrome(hostOf(projects[activeProject]));
    if (e < 1) { sx.fillStyle = 'rgba(143,211,255,.9)'; sx.fillRect(0, SH * e - 2, SW, 3); }
  }
  function drawContact(t: number) {
    sx.fillStyle = C.bg; sx.fillRect(0, 0, SW, SH); chrome('zsh: say hi');
    sx.font = `500 25px ${MONO}`;
    const lines: [string, string][][] = [
      [['$ ', C.key], ['whoami', C.fg]],
      [[`${person.name.toLowerCase()}, ${person.shortRole.toLowerCase()}, ${person.location.toLowerCase()}`, C.prop]],
      [],
      ...person.links.map((l): [string, string][] => [['$ ', C.key], ['open ', C.fg], [l.href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), C.str]]),
    ];
    let y = 108;
    for (const l of lines) { let x = 30; for (const [s, c] of l) { sx.fillStyle = c; sx.fillText(s, x, y); x += sx.measureText(s).width; } y += 52; }
    cursor(30, y, t);
  }
  function drawBoot(t: number) {
    sx.fillStyle = C.bg; sx.fillRect(0, 0, SW, SH); chrome('zsh  ~/kyle-barth.dev');
    sx.font = `500 32px ${MONO}`;
    let y = 112;
    sx.fillStyle = C.key; sx.fillText('$', 34, y); sx.fillStyle = C.fg; sx.fillText('./after-hours --lights-off', 70, y);
    y += 70;
    for (let i = 0; i < bootLines.length; i++) {
      const l = bootLines[i], prev = bootLines[i - 1];
      if (l.shownAt < 0) {
        if (prev && (prev.shownAt < 0 || t - prev.shownAt < BOOT_GAP)) break;
        l.shownAt = t;
      }
      sx.globalAlpha = Math.min(1, (t - l.shownAt) / 0.15);
      if (l.done) { sx.fillStyle = C.str; sx.fillText('✓', 34, y); }
      else { sx.strokeStyle = C.key; sx.lineWidth = 3.5; sx.beginPath(); sx.arc(47, y - 11, 10, t * 7, t * 7 + 4.4); sx.stroke(); }
      sx.fillStyle = C.fg; sx.fillText(l.label, 78, y);
      sx.fillStyle = l.done ? C.mute : C.prop; sx.textAlign = 'right'; sx.fillText(l.detail, SW - 34, y); sx.textAlign = 'left';
      sx.globalAlpha = 1;
      y += 62;
    }
    if (bootSettled(t)) { sx.fillStyle = C.key; sx.fillText('$', 34, y); cursor(70, y, t); }
  }
  /* ---------- The laptop: a test run, or in the experience section the career log ---------- */
  // lapAt: when the laptop switched screens (it fades in); jobsAt: when the jobs start coming in, as
  // the camera settles on the laptop
  let lapLog = false, lapAt = -10, jobsAt = -10, lapDirty = true;
  function drawTests() {
    lx.font = `500 17px ${MONO}`;
    const rows: [string, string][] = [
      ['~/garage $ npm test', C.fg], ['', ''], ['✓ joins a voice channel', C.str], ['✓ plays YouTube links inline', C.str],
      ['✓ flags unread mentions', C.str], ['✓ saves custom emoji', C.str], ['', ''],
      ['Tests  4 passed (4)', C.fg], ['Time   1.21s', C.mute],
    ];
    rows.forEach(([s, c], i) => { lx.fillStyle = c; lx.fillText(s, 22, 42 + i * 32); });
  }
  // the jobs come in one by one, newest first, each its hash, years, company, and the role under it
  function drawCareer(t: number) {
    lx.font = `500 17px ${MONO}`;
    lx.fillStyle = C.fg; lx.fillText('~ $ git log --oneline --since=' + person.since, 22, 42);
    const hashes = ['a3f9c1e', '7be04d2', '19c6fa0'];
    let y = 92;
    jobs.forEach((j, i) => {
      const show = Math.min(1, Math.max(0, (t - jobsAt) * 5 - i * 0.6));
      if (show <= 0) return;
      lx.globalAlpha = show;
      lx.font = `500 17px ${MONO}`;
      lx.fillStyle = C.key; lx.fillText(hashes[i % hashes.length], 22, y);
      lx.fillStyle = C.mute; lx.fillText(j.years.replace(' to ', '–'), 112, y);
      lx.fillStyle = C.fg; lx.fillText(j.company, 222, y);
      lx.fillStyle = C.prop; lx.font = `500 15px ${MONO}`; lx.fillText(j.role, 222, y + 24);
      lx.globalAlpha = 1;
      y += 64;
    });
    lx.font = `500 17px ${MONO}`;
    lx.fillStyle = C.fg; lx.fillText('~ $', 22, y);
    if (Math.floor(t * 2) % 2 === 0) { lx.fillStyle = C.key; lx.fillRect(62, y - 15, 9, 19); }
  }
  function drawLaptop(t: number) {
    lx.fillStyle = '#0b0d18'; lx.fillRect(0, 0, LW, LH);
    if (lapLog) drawCareer(t); else drawTests();
    const fade = Math.min(1, (t - lapAt) / 0.15); // a quick fade in, like the monitor's
    if (fade < 1) { lx.fillStyle = `rgba(5,7,13,${1 - fade})`; lx.fillRect(0, 0, LW, LH); }
    lapTex.needsUpdate = true;
  }
  drawLaptop(0);
  document.fonts?.load(`500 25px ${MONO}`).then(() => { if (disposed) return; screens.fill(null); dirty = true; lapDirty = true; });

  function selectProject(i: number) {
    if (i === activeProject || i < 0 || i >= projects.length) return;
    snapX.drawImage(scr, 0, 0, SW, SH); // (the canvases are scaled: copy them at their layout size)
    activeProject = i; projectAt = time; dirty = true;
  }

  /* ---------- The desk: the monitor first, then everything else, a prop a frame ---------- */
  const env = nightEnvironment(renderer);
  cleanups.push(() => env.dispose());
  // the desk, its lamp and the monitor go up first; the lamp switches on while the rest builds
  const bootSet = buildBootSet({ reduce, lowPower, monitorScreen: screenMat, env: env.texture });
  const lava = bootSet.lava, bootMonitor = bootSet.monitor;
  scene.add(bootSet.desk, bootMonitor);
  let desk: Awaited<ReturnType<typeof buildDeskScene>> | null = null;
  const nextFrame = () => new Promise<void>((ok) => requestAnimationFrame(() => ok()));
  let deskParts = 0;
  const deskBuilt = nextFrame()
    .then(() => buildDeskScene({
      reduce, monitorScreen: screenMat, laptopScreen: lapMat, env: env.texture, yieldFrame: nextFrame,
      onStep: (d, n, label) => { deskParts = n; deskLine.set(`${label}  ${d}/${n}`); },
    }))
    .then((d) => {
      if (disposed) return d;
      desk = d;
      // In the scene (its lights count) but out of sight until precompile() has its shaders ready: the
      // first frame that drew it would compile them all at once and freeze the log. The boot monitor
      // stands in for its monitor meanwhile. The lamp's shadow pass waits for the unveiling as well.
      veil(d.root);
      scene.add(d.root);
      deskLine.done(`${deskParts} props`);
      return d;
    });
  // Its lights are veiled too: a new light changes the shaders of everything already in sight (the boot
  // monitor, the wall), and those would compile on the spot. precompile() lets them back in while it
  // works, so what it builds is lit by them.
  const veiled: [THREE.Object3D, number][] = [];
  const veiledLights: [THREE.Object3D, number][] = [];
  function veil(root: THREE.Object3D) {
    root.traverse((o) => { if (o.layers.mask) { ((o as THREE.Light).isLight ? veiledLights : veiled).push([o, o.layers.mask]); o.layers.mask = 0; } });
  }
  function lightsIn(on: boolean) { for (const [l, mask] of veiledLights) l.layers.mask = on ? mask : 0; }
  /** The rest of the desk comes into sight, its monitor in place of the boot one (same place, no seam). */
  function unveil() {
    lightsIn(true);
    veiledLights.length = 0;
    for (const [o, mask] of veiled.splice(0)) o.layers.mask = mask;
    if (bootMonitor.parent) {
      scene.remove(bootMonitor);
      bootMonitor.traverse((m) => (m as THREE.Mesh).geometry?.dispose()); // its materials are shared with the desk
    }
  }

  /* ---------- Coffee steam ---------- */
  const dotCanvas = newCanvas(64, 64);
  {
    const x = dotCanvas.getContext('2d')!;
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }
  const dot = new THREE.CanvasTexture(dotCanvas);
  dot.colorSpace = THREE.SRGBColorSpace;
  const [mugX, mugY, mugZ] = LAYOUT.mug;
  const steamY = mugY + MUG_RIM - 0.08;
  const steam = Array.from({ length: 18 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: '#dfe6ff', transparent: true, opacity: 0, depthWrite: false }));
    s.userData.t = i / 18;
    scene.add(s);
    return s;
  });

  /* ---------- Camera shots (precomputed; no allocation per frame) ---------- */
  const toShots = (list: readonly { t: Vec3; o: Vec3; fov: number; sx: number; sy: number }[]): Shot[] =>
    list.map((s) => ({ t: new THREE.Vector3(...s.t), sph: new THREE.Spherical().setFromVector3(new THREE.Vector3(...s.o)), fov: s.fov, sx: s.sx, sy: s.sy }));
  const SHOTS = { wide: toShots(RAW_SHOTS.wide), phone: toShots(RAW_SHOTS.phone) };
  const newCam = (): CamState => ({ target: new THREE.Vector3(), radius: 0, phi: 0, theta: 0, fov: 34, sx: 0, sy: 0 });
  const want = newCam(), from = newCam(), cam = newCam();
  const copyCam = (a: CamState, b: CamState) => { a.target.copy(b.target); a.radius = b.radius; a.phi = b.phi; a.theta = b.theta; a.fov = b.fov; a.sx = b.sx; a.sy = b.sy; };
  /** Booting: square on to the monitor, its screen filling most of the view (the full width on phones). */
  const BOOT_FOV = 34;
  function bootPose(aspect: number, phone: boolean, out: CamState) {
    const fill = phone ? 0.94 : 0.72, span = 2 * Math.tan(THREE.MathUtils.degToRad(BOOT_FOV / 2));
    out.target.copy(MONITOR_SCREEN);
    out.radius = Math.max(MONITOR.screenH / fill / span, MONITOR.screenW / fill / (span * aspect));
    out.phi = Math.PI / 2; out.theta = 0; out.fov = BOOT_FOV; out.sx = 0; out.sy = 0;
  }
  function shotFor(i: number, set: Shot[], aspect: number, out: CamState) {
    const s = set[Math.max(0, Math.min(set.length - 1, i))];
    const fit = set === SHOTS.wide
      ? THREE.MathUtils.clamp(Math.pow(1.78 / aspect, 0.55), 0.85, 1.4)
      : THREE.MathUtils.clamp(Math.pow(0.46 / aspect, 0.6), 0.7, 1.3);
    out.target.copy(s.t);
    out.radius = s.sph.radius * fit;
    out.phi = s.sph.phi;
    out.theta = s.sph.theta;
    out.fov = s.fov; out.sx = s.sx; out.sy = s.sy;
  }
  // The camera heads for the shot of the section in view. Crossing into a new section starts a glide
  // from wherever the camera is now, so changing direction mid-glide never snaps.
  let shotIdx = Math.round(stage);
  let glideAt = -Infinity;
  const GLIDE = reduce ? 1.0 : 1.8; // seconds; shorter and gentler when reduced motion is on
  // the pull-back from the monitor to the first shot. With reduced motion it still plays (the page
  // starts from the monitor), on a sine ease: no hard push off, and well under half the top speed
  const FLIGHT = 2.4;
  const flightEase = reduce ? easeInOutSine : easeInOut;
  let glideDur = GLIDE, phase: Phase = 'boot', loaded = false, revealed = false;
  const sph = new THREE.Spherical();

  const pointer = { x: 0, y: 0, sx: 0, sy: 0, px: -1, py: -1 };
  on('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    pointer.px = e.clientX; pointer.py = e.clientY; pointerDirty = true;
  }, { passive: true });

  let W = 1, H = 1;
  function resize() {
    W = document.documentElement.clientWidth || window.innerWidth; // the canvas is laid out inside any scrollbar
    H = window.visualViewport ? Math.max(window.innerHeight, window.visualViewport.height) : window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, phoneQ.matches ? 1.5 : 1.75));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    anchors = measureAnchors(sections);
    stage = stageAt(anchors);
  }
  on('resize', resize);
  resize();

  /* ---------- Hotspots: a few invisible boxes, raycast only when the pointer or camera moved ---------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
  const HOTSPOTS: { p: Vec3; s: Vec3; label: string; to: string | null }[] = [
    { p: [0.25, 1.72, -1.55], s: [4.0, 2.4, 0.6], label: 'Side projects', to: '#work' },
    { p: [-3.2, 1.2, -1.72], s: [0.8, 2.4, 0.8], label: 'Experience', to: '#experience' },
    { p: [-2.3, 0.6, -1.88], s: [1.1, 1.4, 1.1], label: 'Experience', to: '#experience' },
    { p: [-2.8, 0.55, 0.8], s: [2.2, 1.3, 1.8], label: 'Experience', to: '#experience' },
    { p: [-4.2, 0.92, -1.25], s: [1.2, 1.9, 2.4], label: 'Small form factor PC in a Cooler Master NR200P', to: null },
    { p: [-4.25, 0.45, 1.6], s: [0.8, 0.95, 0.8], label: 'A very sleepy, very blocky Snorlax', to: null },
    { p: [3.95, 0.35, 1.15], s: [1.9, 0.9, 1.9], label: 'Grab a coffee and say hi', to: '#contact' }, // the mug and the donut
    { p: [3.65, 2.25, -1.08], s: [2.6, 4.5, 2.7], label: 'Bambu Lab P2S with AMS 2 Pro, printing a tiny garage', to: null },
  ];
  const proxies = HOTSPOTS.map((d) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(d.s[0], d.s[1], d.s[2]), proxyMat);
    m.position.set(d.p[0], d.p[1], d.p[2]);
    m.userData = { label: d.label, to: d.to } satisfies Hotspot;
    m.matrixAutoUpdate = false;
    m.updateMatrix();
    m.updateMatrixWorld(true);
    return m;
  });
  let hover: Hotspot | null = null, ready = false;
  function updateHover() {
    pointerDirty = false;
    if (look.dragging) { hover = null; tip.classList.remove('on'); canvas.style.cursor = 'grabbing'; return; }
    if (!ready || phoneQ.matches || pointer.px < 0 || document.elementFromPoint(pointer.px, pointer.py) !== canvas) hover = null;
    else {
      ndc.set((pointer.px / W) * 2 - 1, -(pointer.py / H) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(proxies, false)[0];
      hover = hit ? (hit.object.userData as Hotspot) : null;
    }
    if (hover) {
      tip.textContent = hover.label;
      tip.style.translate = `${pointer.px + 14}px ${pointer.py + 14}px`;
      tip.classList.add('on');
      canvas.style.cursor = hover.to ? 'pointer' : 'grab';
    } else {
      tip.classList.remove('on');
      canvas.style.cursor = ready ? 'grab' : '';
    }
  }
  // a drag that ends on a hotspot is not a click on it
  const onCanvasClick = () => { if (hover?.to && look.moved < 6) document.querySelector(hover.to)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); };
  canvas.addEventListener('click', onCanvasClick);
  cleanups.push(() => canvas.removeEventListener('click', onCanvasClick));

  /* ---------- Click and drag to look around (mouse and pen; touch keeps scrolling the page) ---------- */
  // The drag turns the camera around the shot's target, on top of the shot. After LOOK_IDLE seconds
  // without a drag, or when the section changes, the camera eases back to the shot.
  const LOOK_IDLE = 5;
  const LOOK_BACK = reduce ? 1.0 : 1.6;
  const LOOK_THETA = 1.45; // never swing past side-on, so the camera stays in front of the wall
  const LOOK_PHI = [0.12, 1.42] as const; // from nearly overhead to just above the desk
  const look = {
    theta: 0, phi: 0, tTheta: 0, tPhi: 0, dragging: false, id: -1, x: 0, y: 0, moved: 0,
    releasedAt: -Infinity, backAt: -Infinity, backDur: LOOK_BACK, fromTheta: 0, fromPhi: 0,
  };
  function lookBack(t: number, dur: number) {
    look.backAt = t; look.backDur = dur; look.fromTheta = look.theta; look.fromPhi = look.phi;
  }
  const onDown = (e: PointerEvent) => {
    if (!ready || e.button !== 0 || e.pointerType === 'touch') return;
    e.preventDefault(); // no text selection while dragging
    canvas.setPointerCapture(e.pointerId);
    // grabbing mid-return holds the view where it is
    Object.assign(look, { dragging: true, id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, tTheta: look.theta, tPhi: look.phi, backAt: -Infinity });
    updateHover();
  };
  const onDrag = (e: PointerEvent) => {
    if (!look.dragging || e.pointerId !== look.id) return;
    const dx = e.clientX - look.x, dy = e.clientY - look.y;
    look.x = e.clientX; look.y = e.clientY; look.moved += Math.abs(dx) + Math.abs(dy);
    // half a turn per screen height, like grabbing the room and pulling it round
    look.tTheta = THREE.MathUtils.clamp(cam.theta + look.tTheta - (dx / H) * Math.PI, -LOOK_THETA, LOOK_THETA) - cam.theta;
    look.tPhi = THREE.MathUtils.clamp(cam.phi + look.tPhi - (dy / H) * Math.PI * 0.6, LOOK_PHI[0], LOOK_PHI[1]) - cam.phi;
  };
  const onRelease = (e: PointerEvent) => {
    if (!look.dragging || e.pointerId !== look.id) return;
    look.dragging = false; look.releasedAt = time;
    updateHover(); // before the click event, so a plain click still finds its hotspot
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onDrag);
  canvas.addEventListener('pointerup', onRelease);
  canvas.addEventListener('pointercancel', onRelease);
  canvas.addEventListener('lostpointercapture', onRelease);
  cleanups.push(() => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onDrag);
    canvas.removeEventListener('pointerup', onRelease);
    canvas.removeEventListener('pointercancel', onRelease);
    canvas.removeEventListener('lostpointercapture', onRelease);
  });

  /* ---------- Compile shaders; the boot log then hands over to the pull-back ---------- */

  /**
   * Compile every shader the desk needs before the camera moves, or the pull-back stalls each time
   * something new comes into view. Two things matter. Programs are keyed on the render target as well
   * as the material: with bloom, the scene draws into the renderer's half-float buffer (untone-mapped,
   * linear), so compiling against the canvas builds variants that are never used. The lamp's shadow
   * pass has programs of its own, one per kind of caster, which compile() never reaches, so stand-ins
   * with the same distance material go through too. And a frame that draws something whose program
   * isn't linked yet waits for it, so they compile a few at a time off to the side (the driver links
   * them in parallel), and only ever get drawn once they're ready: the log keeps ticking throughout.
   */
  const IN_FLIGHT = 4;
  async function precompile(light: THREE.Light, progress: (n: number) => void) {
    const offscreen = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    const jobs: { part: THREE.Object3D; target: THREE.WebGLRenderTarget | null }[] = [];
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh || (o as THREE.Points).isPoints || (o as THREE.Line).isLine || (o as THREE.Sprite).isSprite) jobs.push({ part: o, target: bloom ? offscreen : null });
    });
    const proxies = light.castShadow ? shadowStandIns() : [];
    for (const p of proxies) jobs.push({ part: p, target: offscreen }); // a shadow map is always a render target
    const count = () => renderer.info.programs?.length ?? 0;
    const start = count();
    let flying: Promise<unknown>[] = [];
    const land = async () => { await Promise.all(flying); flying = []; progress(count() - start); await nextFrame(); };
    try {
      for (const { part, target } of jobs) {
        if (disposed) return;
        // compile reaches the whole subtree, so the part's children sit out (they have their own turn)
        const before = count(), prev = renderer.getRenderTarget(), kids = part.children;
        part.children = [];
        renderer.setRenderTarget(target);
        lightsIn(true);
        let ready: Promise<unknown>;
        try { ready = renderer.compileAsync(part, camera, scene); } finally { lightsIn(false); renderer.setRenderTarget(prev); part.children = kids; }
        if (count() === before) continue; // nothing new: its programs are built already
        flying.push(ready);
        if (flying.length >= IN_FLIGHT) await land();
      }
      if (flying.length) await land();
    } finally {
      offscreen.dispose();
      for (const p of proxies) ((p as THREE.Mesh).material as THREE.Material).dispose();
    }
  }
  /** A mesh per shadow caster with the distance material three's shadow pass will draw it with (see
   *  getDepthMaterial in WebGLShadowMap: the side flips, and maps, alpha test and clipping carry over). */
  function shadowStandIns() {
    const flip: Record<number, THREE.Side> = { [THREE.FrontSide]: THREE.BackSide, [THREE.BackSide]: THREE.FrontSide, [THREE.DoubleSide]: THREE.DoubleSide };
    const out: THREE.Object3D[] = [];
    scene.traverseVisible((o) => {
      const m = o as THREE.Mesh;
      if (!o.castShadow || !m.isMesh || (m as THREE.SkinnedMesh).isSkinnedMesh || m.customDistanceMaterial) return;
      for (const mat of ([] as THREE.Material[]).concat(m.material)) {
        const src = mat as THREE.MeshStandardMaterial;
        const d = new THREE.MeshDistanceMaterial({
          side: mat.shadowSide ?? flip[mat.side],
          map: src.map ?? null,
          alphaMap: src.alphaMap ?? null,
          alphaTest: mat.alphaToCoverage ? 0.5 : mat.alphaTest,
          clipShadows: mat.clipShadows, clippingPlanes: mat.clippingPlanes, clipIntersection: mat.clipIntersection,
          displacementMap: src.displacementMap ?? null, displacementScale: src.displacementScale ?? 1, displacementBias: src.displacementBias ?? 0,
        });
        d.visible = mat.visible;
        const inst = m as THREE.InstancedMesh;
        if (!inst.isInstancedMesh) { out.push(new THREE.Mesh(m.geometry, d)); continue; }
        const twin = new THREE.InstancedMesh(m.geometry, d, inst.count);
        twin.instanceColor = inst.instanceColor; // both are part of the program's key
        twin.morphTexture = inst.morphTexture;
        out.push(twin);
      }
    });
    return out;
  }

  // lampAt: when the lamp switches on; flightAt: when the camera starts pulling back.
  // The lamp warms up in a quiet window. Building a prop, merging the desk or linking a batch of shaders
  // each holds a frame for tens of milliseconds on an everyday laptop (hundreds for the merge), and any
  // of those inside the warm-up shows as the lamp stuttering, or swallows its flicker. So it switches on
  // once the desk is built, the shaders compile only once it has warmed up, and the rest of the desk
  // (whose first frame uploads its textures) dissolves in under a still after that.
  let lampAt = -1, flightAt = -1;
  let lampWarmed = () => {};
  const lampWarm = new Promise<void>((ok) => { lampWarmed = ok; });
  deskBuilt
    .then(() => lampWarm)
    .then(() => {
      if (disposed) return;
      const shaders = bootLine('compiling shaders');
      return precompile(lava.light, (n) => shaders.set(`${n} programs`)).then(() => shaders.done(`${renderer.info.programs?.length ?? 0} programs`));
    })
    .then(() => {
      if (disposed || !desk) return;
      unveilDue = true; // the loop brings the rest of the desk in, dissolving it into the lit room
    })
    .catch((err: Error) => {
      if (disposed) return;
      unveil();
      boot.note.textContent = `The desk could not start: ${err.message}`;
      boot.root.classList.add('gone');
      if (!revealed) { revealed = true; o.onReveal(); }
    });

  // The one orchestrated moment: the bulb catches with two flickers, then the lamp warms up (LAMP_WARM).
  function lampLevel(e: number) {
    if (e < 0) return 0;
    if (reduce) return Math.min(1, e / 0.5);
    if (e < 0.05) return 0.45;
    if (e < 0.1) return 0.05;
    if (e < 0.16) return 0.6;
    if (e < 0.22) return 0.2;
    return 0.2 + 0.8 * easeOut(Math.min(1, (e - 0.22) / 1.2));
  }
  const LAMP_WARM = reduce ? 0.5 : 1.42;
  // A subtle, living flicker: layered slow waves, plus a rare brief dip.
  let nextDip = 6, dipAt = -10;
  function flicker(t: number) {
    if (reduce) return 1;
    const n = Math.sin(t * 9.7) * 0.5 + Math.sin(t * 15.3 + 1.3) * 0.3 + Math.sin(t * 4.1 + 0.7) * 0.2;
    let f = 1 + n * 0.03;
    if (t > nextDip) { dipAt = t; nextDip = t + 5 + Math.random() * 8; }
    const d = t - dipAt;
    if (d < 0.2) f *= d < 0.05 ? 0.88 : d < 0.1 ? 1 : d < 0.15 ? 0.93 : 1;
    return f;
  }

  /*
   * Bringing the rest of the desk in. By now the lamp is lighting the room, so props appearing all at
   * once would pop: the last frame without them is copied into a canvas over the scene, they come in
   * underneath, and the copy fades away (an opacity transition, so it runs smoothly whatever the first
   * frames with the new props cost). The pull-back waits for it.
   */
  const XFADE = reduce ? 0.3 : 0.6;
  let unveilDue = false, unveiledAt = -1;
  function unveilUnderCopy() {
    unveilDue = false;
    const copy = document.createElement('canvas');
    copy.className = 'gl-copy';
    copy.width = canvas.width; copy.height = canvas.height;
    copy.getContext('2d')?.drawImage(canvas, 0, 0); // the frame just drawn, before it is composited away
    copy.style.transition = `opacity ${Math.round((XFADE / timeScale) * 1000)}ms ease`;
    canvas.after(copy);
    unveil();
    lava.light.shadow.needsUpdate = true; // its shadows again, now that the whole desk casts them
    unveiledAt = time;
    loaded = true; // step() starts the pull-back once this has faded and the last line has been read
    requestAnimationFrame(() => requestAnimationFrame(() => { copy.style.opacity = '0'; }));
    copy.addEventListener('transitionend', () => copy.remove(), { once: true });
    cleanups.push(() => copy.remove());
  }

  /* ---------- Loop ---------- */
  let lastDraw = -1, lastLap = -1, lapBlink = 0, monBlink = 0;
  let handedAt = -1; // when the 3D monitor took over from the page's stand-in
  let lampOn = false;
  const glowTarget = new THREE.Color();
  function step(dt: number) {
    time += dt;
    const t = time, phone = phoneQ.matches;
    const set = phone ? SHOTS.phone : SHOTS.wide;

    // The lamp switches on once the 3D monitor has taken over and the desk is built (see lampWarm).
    // boot -> flight: everything has loaded, the lamp is warm, and the last line of the log has been read.
    if (lampAt < 0 && desk && handedAt >= 0 && t - handedAt > (reduce ? 0.15 : 0.35)) { lampAt = t; lampLine = bootLine('switching on the lava lamp'); }
    const e = lampAt < 0 ? -1 : t - lampAt;
    if (e >= LAMP_WARM && !lampOn) { lampOn = true; lampLine?.done('on'); lampWarmed(); }
    const last = bootLines[bootLines.length - 1];
    if (phase === 'boot' && loaded && e >= LAMP_WARM && t - unveiledAt > XFADE && last.shownAt >= 0 && t - last.shownAt > BOOT_GAP * 1.6) {
      phase = 'flight';
      flightAt = t;
      shotIdx = Math.max(0, Math.min(set.length - 1, Math.round(stage)));
      copyCam(from, cam);
      glideAt = t;
      glideDur = FLIGHT;
    }

    const L = lampLevel(e);
    // the room comes into view with the lamp: dark at first, then up as the lamp warms (not its flickers)
    const room = e < 0 ? 0 : easeInOutSine(Math.min(1, e / LAMP_WARM));
    roomLevel(room);
    const f = flightAt < 0 ? -1 : t - flightAt;
    const SL = f < 0.45 ? 0 : easeOut(Math.min(1, (f - 0.45) / 0.3)); // the laptop wakes as the camera leaves
    lava.update(t, L, e > 1.5 ? flicker(t) : 1);
    lapMat.color.setScalar(SL * 0.95);
    // The exposure holds through the boot, so the screen keeps the stand-in's look while the lamp lights
    // the room round it, and opens up as the camera pulls back.
    renderer.toneMappingExposure = 0.75 + 0.45 * L * (f < 0 ? 0 : easeInOutSine(Math.min(1, f / 1.2)));

    // camera: square on to the monitor while booting; then glide to the shot of the section in view
    // (a little hysteresis stops boundary bounce)
    let k = 1;
    if (phase === 'boot') bootPose(W / H, phone, cam);
    else {
      if (Math.abs(stage - shotIdx) > 0.55) {
        copyCam(from, cam);
        shotIdx = Math.max(0, Math.min(set.length - 1, Math.round(stage)));
        glideAt = t;
        glideDur = GLIDE;
        if (!look.dragging && (look.theta || look.phi)) lookBack(t, GLIDE); // a new section starts from its own shot
      }
      shotFor(shotIdx, set, W / H, want);
      const ease = phase === 'flight' && glideDur === FLIGHT ? flightEase : easeInOut;
      k = glideDur > 0 ? ease(Math.min(1, (t - glideAt) / glideDur)) : 1;
      if (k >= 1) copyCam(cam, want);
      else {
        let dT = want.theta - from.theta;
        if (dT > Math.PI) dT -= Math.PI * 2; else if (dT < -Math.PI) dT += Math.PI * 2;
        cam.target.lerpVectors(from.target, want.target, k);
        cam.radius = THREE.MathUtils.lerp(from.radius, want.radius, k);
        cam.phi = THREE.MathUtils.lerp(from.phi, want.phi, k);
        cam.theta = from.theta + dT * k;
        cam.fov = THREE.MathUtils.lerp(from.fov, want.fov, k);
        cam.sx = THREE.MathUtils.lerp(from.sx, want.sx, k);
        cam.sy = THREE.MathUtils.lerp(from.sy, want.sy, k);
      }
      // landed: the desk is live, and the page comes in
      if (phase === 'flight' && k >= 1) {
        phase = 'live';
        ready = true;
        pointerDirty = true;
        if (!revealed) { revealed = true; o.onReveal(); }
      }
    }

    // look-around: follow the drag closely; after a pause, ease back to the shot
    if (!look.dragging && look.backAt === -Infinity && (look.tTheta || look.tPhi) && t - look.releasedAt > LOOK_IDLE) lookBack(t, LOOK_BACK);
    if (look.backAt > -Infinity) {
      const b = Math.min(1, (t - look.backAt) / look.backDur), f = 1 - easeInOut(b);
      look.theta = look.tTheta = look.fromTheta * f;
      look.phi = look.tPhi = look.fromPhi * f;
      if (b >= 1) look.backAt = -Infinity;
      pointerDirty = true;
    } else if (look.theta !== look.tTheta || look.phi !== look.tPhi) {
      const lk = 1 - Math.exp(-dt * 14);
      look.theta += (look.tTheta - look.theta) * lk;
      look.phi += (look.tPhi - look.phi) * lk;
      if (Math.abs(look.tTheta - look.theta) + Math.abs(look.tPhi - look.phi) < 1e-4) { look.theta = look.tTheta; look.phi = look.tPhi; }
      pointerDirty = true;
    }

    // pointer parallax holds still while dragging, so only the drag moves the view
    const pk = 1 - Math.exp(-dt * 3.2);
    if (!look.dragging) {
      pointer.sx += ((phone || reduce ? 0 : pointer.x) - pointer.sx) * pk;
      pointer.sy += ((phone || reduce ? 0 : pointer.y) - pointer.sy) * pk;
    }
    // (the look-around and parallax stop short of level; the camera's own pose may be square on)
    sph.set(cam.radius, THREE.MathUtils.clamp(cam.phi + look.phi + pointer.sy * 0.035, 0.05, Math.max(1.5, cam.phi)), cam.theta + look.theta - pointer.sx * 0.06);
    camera.position.setFromSpherical(sph).add(cam.target);
    camera.lookAt(cam.target);
    camera.fov = cam.fov;
    camera.setViewOffset(W, H, -cam.sx * W, cam.sy * H, W, H);
    camera.updateProjectionMatrix();
    if (k < 1) pointerDirty = true;

    // the monitor runs the boot log until the camera lands, then follows the section in view
    const m: Mode = phase === 'live' ? MODES[shotIdx] : 'boot';
    if (m !== mode) { mode = m; modeAt = t; dirty = true; }
    if (mode === 'code' && typed < codeLen) { typed = Math.min(codeLen, typed + dt * 38); dirty = true; }
    // Redraw only while something on it moves: the boot log, the typing, a project's wipe, the fade into
    // a mode (or a still screen freezes half-faded), or the cursor's blink. Each redraw is a texture upload.
    const blink = Math.floor(t * 2);
    const animating = mode === 'boot' || t - modeAt < 0.25 || (mode === 'project' ? t - projectAt < WIPE + 0.05 : blink !== monBlink);
    if (t - lastDraw > 0.045 && (dirty || animating)) {
      if (mode === 'boot') drawBoot(t); else if (mode === 'code') drawCode(t); else if (mode === 'project') drawProject(t); else drawContact(t);
      const fade = Math.min(1, (t - modeAt) / 0.15);
      if (fade < 1) { sx.fillStyle = `rgba(5,7,13,${1 - fade})`; sx.fillRect(0, 0, SW, SH); }
      scrTex.needsUpdate = true; dirty = false; lastDraw = t; monBlink = blink;
    }
    // A project at rest shows its own screen at SK x (uploaded once per pick); everything else, the
    // wipe included, shows the 1x live screen.
    const still = mode === 'project' && !animating && !dirty ? screenFor(activeProject) : null;
    if (still && stillTex.image !== still) { stillTex.image = still; stillTex.needsUpdate = true; }
    const shown = still ? stillTex : scrTex;
    if (screenMat.map !== shown) screenMat.map = shown;
    // the laptop: the career log while the experience section is in view (animating: the jobs come in,
    // the cursor blinks), the test run otherwise
    const wantLog = phase === 'live' && shotIdx === LAPTOP_LOG;
    if (wantLog !== lapLog) { lapLog = wantLog; lapAt = t; jobsAt = Math.max(t, glideAt + glideDur * 0.7); lapDirty = true; }
    if ((lapDirty || t - lapAt < 0.2 || (lapLog && (t - jobsAt < 0.8 || blink !== lapBlink))) && t - lastLap > 0.045) {
      drawLaptop(t); lapDirty = false; lastLap = t; lapBlink = blink;
    }
    glowTarget.copy((mode === 'project' && glows[activeProject]) || SCREEN_GLOW);
    screenLight.color.lerp(glowTarget, 1 - Math.exp(-dt * 4));
    screenLight.intensity = (mode === 'project' ? 9 : 7) * room; // its glow on the desk comes up with the room

    // the mug steams, the printer prints
    for (let i = 0; i < steam.length; i++) {
      const sp = steam[i], life = (t * 0.22 + (sp.userData.t as number)) % 1;
      sp.position.set(mugX + Math.sin(life * 6 + i) * 0.08 * life, steamY + life * 1.1, mugZ + Math.cos(life * 5 + i) * 0.06 * life);
      sp.scale.setScalar(0.12 + life * 0.45);
      sp.material.opacity = Math.sin(life * Math.PI) * 0.09 * L;
    }
    desk?.printer.update(t, dt, L);

    if (pointerDirty) updateHover();
    renderer.render(scene, camera);
  }

  const timer = new THREE.Timer();
  timer.connect(document);
  let frames = 0, timeScale = 1;
  // The page's stand-in fades the screen in; the 3D monitor takes over once it has, and has drawn.
  const fadeIn = boot.root.querySelector('.boot-screen')?.getAnimations?.()[0];
  let fadedIn = !fadeIn || fadeIn.playState === 'finished';
  fadeIn?.finished.then(() => { fadedIn = true; }, () => { fadedIn = true; });
  renderer.setAnimationLoop(() => {
    timer.update();
    step(Math.min(timer.getDelta(), 0.05) * timeScale);
    if (handedAt < 0 && ++frames >= 2 && fadedIn) { boot.root.classList.add('gone'); handedAt = time; }
    if (unveilDue) unveilUnderCopy();
  });

  return {
    selectProject,
    /** Advance the scene by n frames (handy for checking shots when the tab is not painting). */
    step: (n = 60) => { for (let i = 0; i < n; i++) step(1 / 30); },
    /** Run the scene clock slower (0.25 = quarter speed), for checking motion frame by frame. */
    slow: (f = 0.25) => { timeScale = f; },
    /** Where the boot has got to and where the camera is (debug, and the e2e checks). */
    state: () => ({
      phase, mode, t: time, loaded, frames, lamp: lampAt < 0 ? -1 : time - lampAt,
      cam: { pos: camera.position.toArray(), fov: camera.fov, target: cam.target.toArray() },
      lines: bootLines.map((l) => `${l.done ? 'ok' : '..'} ${l.label} ${l.detail}`.trim()),
    }),
    /** Replace one camera shot while tuning framing (debug only). */
    setShot: (i: number, s: { t: Vec3; o: Vec3; fov: number; sx: number; sy: number }, phone = false) => {
      (phone ? SHOTS.phone : SHOTS.wide)[i] = toShots([s])[0];
      glideAt = -Infinity;
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      timer.dispose();
      cleanups.forEach((fn) => fn());
      disposeTree(scene);
      proxies.forEach((p) => p.geometry.dispose());
      bloom?.dispose();
      renderer.dispose();
    },
  };
}
