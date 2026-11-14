// Bambu Lab P2S with an AMS 2 Pro on top, in millimetres. lib/scene/p2s.ts builds the model from these
// numbers and nothing else, and the model lab checks the built parts against them (?lab=printer, __labCheck).
//
// Sources
// - Official: P2S 392 x 406 x 478 mm (Bambu wiki P2S FAQ, iFixit, 3DJake); AMS 2 Pro 372 x 280 x 226 mm
//   (Bambu's AMS 2 Pro spec sheet PDF).
// - Measured: Bambu's straight-on product renders (front, front with AMS, left side), which are
//   orthographic: the AMS base comes out at exactly its official 372 mm at the front face's scale. Scale
//   comes from the body width (front) or height (side): front 0.3403 and 0.4284 mm/px, side 0.4296 mm/px
//   on the 2400 px originals. Read to +-1.5 mm on large features, +-1 mm on small ones.
// - Rear details from a review photo (bgeek.eu), placed to +-5 mm; the rear is never seen in the scene.
//
// Where measured and official numbers differ: the body measures 476 mm tall against 392 wide in both
// front renders (official 478, inside tolerance), and the side panel is 396 mm deep (official 406
// includes the filament buffer and fittings on the back).
//
// Axes: x to the user's right, y up from the floor, z toward the user; the body is centred on x = z = 0.

export const P2S = {
  body: {
    w: 392, h: 476, d: 396,
    feet: 6, // dark plinth under the shell
    cornerR: 11, // vertical corners
    edgeR: 3, // top and bottom edges
    pillarDepth: 15, // the front pillars and bands are this thick before the chamber opens up
  },
  front: { pillar: 33.4, topBand: 58.3, bottomBand: 27.4 }, // the door fills the rest: 325.2 x 384.3
  door: { frameW: 2.5, hinge: { w: 14, h: 4 }, catches: { x: [-138.5, -113], y: [50, 403.6], d: 8.5 } },
  handle: { w: 45.6, h: 14.3, x: 153.5, y: 244.3, proud: 5 }, // straddles the door's right edge
  logo: { x0: 79, x1: 147, y0: 459, y1: 468 }, // "Bambu Lab | P2S", right side of the top band
  roofFitting: { d: 30, h: 8, z: 160 }, // brushed metal, centred on x
  topGlass: { inset: 14 }, // removable glass lid; unverified size, mostly hidden under the AMS
  screen: {
    w: 128, h: 80.8, t: 9, r: 7,
    face: { x: -80, y: 468.3, z: 228.4 }, // centre of the front face
    tilt: 22.4, // degrees, top leaning back
    display: { w: 111, h: 62.4 }, // 5 inch, 16:9
  },
  sideMark: { w: 53.5, h: 70.5, top: 313.2, word: { w: 120.5, h: 13.8, top: 236.7 } }, // both sides, centred on z
  handGrip: { w: 124, h: 22 }, // vented recess along the bottom edge of each side, centred on z
  rear: {
    buffer: { x: 34, y0: 255, y1: 324, w: 108, proud: 20 }, // 22 mm in the side render
    vent: { x0: -136.5, x1: -91, y0: 146, y1: 248 },
    chute: { x0: -82, x1: -27, y0: 148, y1: 248 },
    power: { x0: 125, x1: 155, y0: 46, y1: 97 },
    coupler: { x: -144, y: 462 },
  },
  chamber: {
    xRail: { y: 371, x: 146, d: 8 }, // X axis rod across the gantry
    toolhead: { w: 57.6, h: 69, d: 55, fan: 40 },
    bed: { w: 262, d: 262, t: 19 },
    zRods: [[-140, 130], [140, 130], [0, -150]] as [number, number][], // x, z
    rearGrille: { x0: 57, x1: 121, y0: 105, y1: 286 },
  },
  ams: {
    w: 372, d: 282, base: 124, // base tub; the lid takes the total to 227 (official 226)
    front: 109.3, // z of the AMS's front face: 89 mm behind the printer's front
    // a 107 mm arc, 214 mm front to back; the apex splits the side render (703) and the front one (698)
    lid: { r: 107, len: 354, axisY: 595, axisZ: -49.4, top: 702 },
    rim: 601, // y of the base's top rim
    slots: 4, pitch: 86.7,
    feeder: { w: 35, bucket: [496, 531] as [number, number], unit: [531, 573] as [number, number] },
    logo: { x0: 53.4, x1: 154.5, y0: 570.6, y1: 581 },
    ledgeFitting: { d: 21, h: 6, z: 84 },
    spool: { d: 200, w: 66, hub: 55, axisY: 605 },
  },
} as const;

/**
 * The reference renders, for the lab's overlay (?lab=printer, __labOverlay('side')). Each maps image
 * pixels to millimetres: mmPerPx, the pixel column of the body's centre line (x = 0 seen from the front,
 * z = 0 from the side) and the pixel row of the floor. The images themselves are Bambu's and stay out of
 * the repo; the lab fetches them from the local receiver (?save=<port>, served from its reference folder).
 */
export type RefImage = {
  file: string; view: 'front' | 'left'; mmPerPx: number; cx: number; floorY: number;
  ams?: boolean; // printer refs: shows the AMS on top
  roi?: [number, number, number, number]; // x0, y0, x1, y1: compare only this part of the image
};
export const P2S_REFS: Record<string, RefImage> = {
  front: { file: 'p2s-front.jpg', view: 'front', mmPerPx: 0.34028, cx: 1198, floorY: 2010, ams: false },
  'front-ams': { file: 'p2s-front-ams.jpg', view: 'front', mmPerPx: 0.42842, cx: 1198.5, floorY: 2015, ams: true },
  side: { file: 'p2s-side-ams.jpg', view: 'left', mmPerPx: 0.4296, cx: 1198.5, floorY: 2015, ams: true },
};

/** Checks run by the lab: each is a measured quantity with a tolerance, in mm or degrees. */
export const P2S_CHECKS: { name: string; want: number; tol: number }[] = [
  { name: 'body width', want: P2S.body.w, tol: 2 },
  { name: 'body height', want: P2S.body.h, tol: 3 },
  { name: 'body depth', want: P2S.body.d, tol: 4 },
  { name: 'door width', want: P2S.body.w - 2 * P2S.front.pillar, tol: 2 },
  { name: 'door height', want: P2S.body.h - P2S.body.feet - P2S.front.topBand - P2S.front.bottomBand, tol: 2 },
  { name: 'screen width', want: P2S.screen.w, tol: 2 },
  { name: 'screen left edge from body edge', want: P2S.screen.face.x - P2S.screen.w / 2 + P2S.body.w / 2, tol: 2 },
  { name: 'screen top above roof', want: 29.6, tol: 2 },
  { name: 'screen bottom below roof', want: 45.1, tol: 2 },
  { name: 'screen bottom edge in front of face', want: 45.8, tol: 3 },
  { name: 'handle width', want: P2S.handle.w, tol: 1.5 },
  { name: 'handle centre below top', want: P2S.body.h - P2S.handle.y, tol: 2 },
  { name: 'AMS width', want: P2S.ams.w, tol: 2 },
  { name: 'AMS depth', want: P2S.ams.d, tol: 3 },
  { name: 'AMS front behind printer front', want: P2S.body.d / 2 - P2S.ams.front, tol: 3 },
  { name: 'AMS total height', want: P2S.ams.lid.top - P2S.body.h, tol: 3 },
  { name: 'AMS lid front to back', want: 214, tol: 3 },
  { name: 'AMS lid width', want: P2S.ams.lid.len, tol: 3 },
];
