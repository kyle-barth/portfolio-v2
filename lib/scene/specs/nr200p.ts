// Cooler Master NR200P MAX V2 (grey), in millimetres. lib/scene/props/pc.ts builds the case from these
// numbers and nothing else, and the model lab checks the built parts against them (?lab=pc).
//
// Sources
// - Official (coolermaster.com): 360 x 185 x 274 mm without protrusions, 377 x 185 x 292 with; grey.
// - Measured: the dimensioned side and front drawings in Cooler Master's build guide (page 3), rendered
//   at 0.2626 mm/px; the scale is taken from the drawn 292 mm height, and the body's 360 mm length then
//   agrees to 0.3 mm. Lines read to +-1 px (0.3 mm). Every hole of the Ncore pattern is read off the same
//   drawing (its rule below fits all 414 of them to +-1 px).
// - From Cooler Master's gallery renders: the round on the front's vertical edges (the drawing shows only
//   its two tangent lines, 12 mm apart either way), the colours, the top's mesh and the I/O tray.
//
// Layout as it stands on the desk: the front faces the room, the tempered-glass left panel faces the wall
// and the right panel, steel with the Ncore pattern, faces the desk. Inside, behind the glass, the GPU
// sits on its riser in front of the motherboard, with the 280 mm radiator and its fans under the top.
//
// Axes: x to the case's right (the desk side), y up from the desk, z toward the front. The body is
// centred on x = z = 0, so the front face is at z = +180 and the rear face at z = -180.

export const NR200 = {
  w: 185, h: 292, d: 360,
  // the body stands on four feet; the front cover wraps its vertical edges round a 12 mm radius
  feet: {
    h: 18.6,
    // each foot: its top and bottom spans, front to back (z) and across (x), measured in from the
    // case's outer faces; the outer faces slope in a little, the inner faces steeply
    rear: { z: [1.4, 43.9], zBottom: [7.0, 27.5] },
    front: { z: [20.4, 61.8], zBottom: [25.2, 46.6] },
    x: [0.7, 41.6], xBottom: [5.6, 26.1],
  },
  // its top edge rounds over 1.8 mm (both drawings)
  front: { depth: 18.6, round: 12, topEdge: 1.8 },
  // The top: the cover's sides are grey steel 8.8 mm deep, its rear edge rounded; from above it is black
  // to the edge, a fine mesh (1.2 mm pitch) inside a dark lip 1.5 mm wide, its front corners following
  // the front cover's rounds. A tab stands proud of its rear edge (width not drawn).
  top: { h: 8.8, rearR: 4.5, lip: 1.5, meshPitch: 1.2, tab: { proud: 3.7, h: 16.5, below: 4.7, w: 50 } },
  // the I/O tray, recessed 3 mm into the top at the front edge, with rounded ends: centre and width
  // across, front to back, and where each port sits along it (0 at the glass side): USB-C, USB-A, the
  // power button (a hexagon pointed left and right, 16 x 13 mm, ringed in white light), USB-A, audio
  io: { x: 3, w: 105, d: 15, recess: 3, ports: [0.15, 0.34, 0.55, 0.76, 0.92], button: { w: 16, d: 13 } },
  // the side panels: from 2.1 mm in front of the rear face, 337.2 long; 20 mm up to 0.8 mm under the top
  // cover (the drawing's double line at its foot)
  side: { z0: 2.1, len: 337.2, y0: 20.0, y1: 282.4 },
  // The Ncore pattern: a motif of ten rows that repeats every 63.8 mm down the panel, three times, the
  // top row 240.4 mm up. Each row: its drop from the motif's top, the hole ('/' slot rising toward the
  // front, '\' falling, 'o' round), where its first hole sits (mm from the rear face) and the step to
  // the next (12.74 mm, or every other column). Holes run no further than 314.7 mm from the rear. Sizes
  // line centre to line centre, averaged over all 276 slots and 138 round holes.
  // That is the left panel as drawn. The right panel, seen from outside, looks the same as the drawing:
  // its holes are the drawing's mirrored front to back (the backlit holes in gallery 04, seen from
  // inside, slant the other way at each row's height).
  ncore: {
    top: 240.4, motif: 63.8, repeats: 3, pitch: 12.74, end: 314.7,
    slot: { l: 14.6, w: 5.9 }, round: 5.9,
    rows: [
      [0, '/', 31.1, 1], [9.45, 'o', 46.6, 2], [12.6, '/', 30.6, 2], [19.2, '\\', 43.5, 2], [22.3, 'o', 33.7, 2],
      [31.8, '\\', 30.6, 1], [41.5, 'o', 40.6, 2], [44.6, '\\', 30.6, 2], [51.2, '/', 43.5, 2], [54.1, 'o', 27.7, 2],
    ] as [number, '/' | '\\' | 'o', number, number][],
  },
  // the badge on the front: an outlined hexagon, flat sides upright, centred across, its centre 110.6 up
  logo: { w: 29.8, h: 23.4, side: 12.1, y: 110.6, line: 1.0 },
  // the rear: thumbscrews stand 9.6 mm proud; the power inlet sits under the motherboard's I/O on the
  // desk side, 24 to 47 mm up (the side drawing) and 6 mm proud; a perforated vent above the slot covers
  // (gallery 03 and the build guide's rear view, +-10 mm)
  rear: { thumb: 9.6, inlet: { x: 50, w: 31, y: [24, 47], proud: 6 }, vent: { x: [-86, -22], y: [170, 215] } },
} as const;

/** The references for the lab's overlay (?lab=pc), rendered from Cooler Master's build guide. */
export const NR200_REFS = {
  side: { file: 'nr200-page3-z5.png', view: 'left' as const, mmPerPx: 0.2626, cx: 1082.5, floorY: 1705.5, roi: [330, 570, 1800, 1707] as [number, number, number, number] },
  front: { file: 'nr200-page3-z5.png', view: 'front' as const, mmPerPx: 0.2626, cx: 2556, floorY: 1705.5, roi: [2180, 570, 2935, 1707] as [number, number, number, number] },
  // Cooler Master's front three-quarter render (the Ncore panel on the left side, front on the right)
  three: { file: 'nr200p-max-v2-gallery-01.png', view: 'persp' as const, mmPerPx: 0, cx: 0, floorY: 0, thr: 30, yaw: [-90, 0] as [number, number] },
};

/** Checks run by the lab: each is a measured quantity with a tolerance, in mm. */
export const NR200_CHECKS: { name: string; want: number; tol: number }[] = [
  { name: 'width', want: NR200.w, tol: 0.5 },
  { name: 'height', want: NR200.h, tol: 0.5 },
  { name: 'depth without protrusions', want: NR200.d, tol: 0.5 },
  { name: 'depth with the thumbscrews', want: NR200.d + NR200.rear.thumb, tol: 0.8 },
  { name: 'body height (without feet)', want: NR200.h - NR200.feet.h, tol: 0.5 },
  { name: 'front cover depth', want: NR200.front.depth, tol: 0.4 },
  { name: 'front face flat width', want: NR200.w - 2 * NR200.front.round, tol: 0.6 },
  { name: 'top cover height', want: NR200.top.h, tol: 0.3 },
  { name: 'side panel length', want: NR200.side.len, tol: 0.5 },
  { name: 'side panel height', want: NR200.side.y1 - NR200.side.y0, tol: 0.5 },
  { name: 'foot top, front to back', want: NR200.feet.rear.z[1] - NR200.feet.rear.z[0], tol: 0.6 },
  { name: 'foot bottom, front to back', want: NR200.feet.rear.zBottom[1] - NR200.feet.rear.zBottom[0], tol: 0.6 },
  { name: 'front foot, set back from the front', want: NR200.feet.front.z[0], tol: 0.6 },
  { name: 'badge width', want: NR200.logo.w, tol: 0.4 },
  { name: 'badge height', want: NR200.logo.h, tol: 0.4 },
  { name: 'badge centre above the desk', want: NR200.logo.y, tol: 0.4 },
  { name: 'Ncore holes', want: 414, tol: 0 },
  { name: 'Ncore first hole from the rear', want: 27.7, tol: 0.5 },
  { name: 'Ncore last hole from the rear', want: 313.7, tol: 0.8 },
  { name: 'Ncore lowest row above the desk', want: 58.4, tol: 0.5 },
];
