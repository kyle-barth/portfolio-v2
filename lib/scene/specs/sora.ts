// Ninjutso Sora V2 (white), in millimetres. lib/scene/props/mouse.ts builds the mouse from these numbers
// and nothing else, and the model lab checks the built parts against them (?lab=mouse).
//
// Sources
// - Official (ninjutso.com, Sora V2 8K page, same shell as the Sora V2): length 119.2, grip width 59,
//   height 37.3 mm; 39 g.
// - Measured: Ninjutso's straight-down product render (the pink one: the white is white on white),
//   560 px for the 119.2 mm length, 0.2129 mm/px; and the side profile in their "improved shape for
//   claw" panel, 1445 px for the length, 0.0825 mm/px, heights scaled to the official 37.3 (the render
//   reads 37.0). The side render is lit only along its edges, so it was read brightened, to about
//   +-0.2 mm; under the wheel the shell is interpolated. The wheel and the top logo from the white top
//   render; the skates from the underside render on the comparison panel.
// - Not measured directly: the cross-section (no front or back view), fitted to where the side splits
//   run in the top and side renders; the nose undercut and tail chamfer read off the side render to
//   about +-1 mm.
//
// Measured widths: the sides run almost straight, 60.0 to 60.5 mm across from 24 to 63 mm back (the
// official 59 mm grip width is a little narrower than the render reads), widest at 62.2 mm, 77 to 86 mm
// back. The hump peaks 72.6 mm from the front.
//
// Axes: the mouse points down -z (its front, the buttons, away from the hand); x to the right, y up
// from the desk. The footprint is centred on x = z = 0, so the front tip is at z = -59.6.

export const SORA = {
  length: 119.2, height: 37.3, skates: 0.8,
  // plan: [distance back from the front tip, half-width], right-hand side (the left carries the side buttons);
  // the tips read again at 0.1 mm steps, where they round off
  plan: [
    [0, 0], [0.5, 4.5], [1.0, 6.6], [1.8, 10.5], [3, 15.75], [6, 22.56], [8.9, 26.18], [11.9, 28.31], [14.9, 29.16], [17.9, 29.59], [20.9, 29.8], [23.8, 30.01],
    [29.8, 30.01], [32.8, 30.23], [62.6, 30.23], [65.6, 30.44], [71.5, 30.65], [74.5, 30.86], [77.5, 31.08], [86.4, 31.08],
    [89.4, 30.86], [92.4, 30.65], [95.4, 30.01], [98.3, 29.16], [101.3, 27.88], [104.3, 26.18], [107.3, 24.27], [110.3, 21.71],
    [113.2, 17.88], [116.2, 12.98], [117.1, 10.75], [118.2, 7.45], [118.8, 4.15], [119.2, 0],
  ] as [number, number][],
  // profile: [distance back from the front tip, height of the top along the centre line above the desk]
  profile: [
    [0, 12.0], [3.3, 13.9], [6.6, 15.8], [9.9, 17.6], [13.2, 19.0], [33.0, 28.2], [36.3, 29.3], [39.6, 30.4], [42.9, 31.5],
    [46.2, 32.6], [49.5, 33.5], [52.8, 34.4], [56.1, 35.2], [59.4, 35.8], [62.7, 36.4], [66.0, 36.9], [69.3, 37.2], [72.6, 37.3],
    [75.9, 37.2], [79.2, 37.0], [82.5, 36.5], [85.8, 35.8], [89.1, 34.8], [92.4, 33.6], [95.7, 31.7], [99.0, 29.7], [102.3, 27.7],
    [105.6, 24.9], [108.9, 22.3], [112.2, 18.5], [115.5, 14.4], [117.2, 11.9], [119.2, 7.5],
  ] as [number, number][],
  // Cross-section above the edge, as height fraction f over width fraction x (0 on the centre line, 1 at
  // the edge): f = (1 - dome x^2) (1 - x^shoulder)^(1/2), a shallow dome over a tight shoulder and
  // near-vertical sides. Fitted to the buttons' side splits, which run 1.7 to 2.5 mm inside the outline
  // from above and 0.6 (12 mm back) to 7.5 mm (50 mm back) below the top from the side: the buttons are
  // flat across at the front (the first values) and dome from 32 mm back (the second). From the seam the
  // palm hump rounds off into the tail (the third): fitted to the three-quarter render, whose outline it
  // matches best (IoU 0.948 with the camera the lab finds, against 0.935 for a shoulder of 10).
  section: { dome: [0.04, 0.22, 0], shoulder: [60, 30, 2.4], at: [12, 32, 50, 84] },
  // the side splits, seen from above, run this far inside the outline (2.5 at the seam's end); in front
  // of `front` mm back they turn down the buttons' front face into the lip
  split: { inset: 2.0, front: 8 },
  // Below the edge a chamfer runs in to the base along the outline's normal. The edge is 3.2 mm up on
  // the sides; at the nose it is the buttons' lip, 10.5 mm up, with the front stepping back 4.5 mm
  // beneath it (3.5 mm by 5.4 mm up in the side render) and easing to the sides' 2.7 by 15 mm back. Under
  // the buttons' lip a dark gap, 0.8 mm, runs round the nose between the two stacked lips, rising from
  // 9.5 mm up at the tip to 10.8 where it ends, 9 mm back. At the tail the edge rises to a point 7.8 mm
  // up, and the chamfer runs 5.7 mm back in to the floor (the side render, +-1 mm).
  edge: { side: 3.2, lip: 10.5, tail: 7.8 },
  gap: { y: [9.5, 10.8], to: 9 },
  tuck: { front: 4.5, side: 2.7, tail: 5.7 },
  // the buttons end at a seam 54.7 mm back on the centre line, curving forward to 50.2 mm at x = +-27.7
  seam: { centre: 54.7, side: 50.2, x: 27.7 },
  // a blue tread between white discs; top: its height above the desk
  wheel: { slot: { from: 12.3, to: 31.7, w: 9.2 }, at: 23.9, d: 20, w: 7.6, tread: 4.8, top: 27.3 },
  // side buttons on the left: back from the front tip, and their bottom and top above the desk at each end
  // from above they stand 0.9 to 1.1 mm past the right-hand side's outline (the top render), which on
  // this section makes them 1.6 mm proud; round at their far ends, dished
  sideButtons: [
    { from: 36.4, to: 52.4, y0: [15.2, 17.0], y1: [21.6, 23.3] },
    { from: 55.4, to: 70.5, y0: [18.3, 19.5], y1: [24.2, 25.0] },
  ],
  sideButtonProud: 1.6,
  logo: { at: 100.8, w: 13.6, l: 12.8 }, // on the top, centred
  // PTFE skates, traced off Ninjutso's straight-up render of the underside (0.34 mm/px, +-0.7 mm, its
  // length and base plate agreeing with the measurements above to 1%): [x out from the centre line, s back
  // from the front tip] round each right-hand pad, mirrored on the left (the back pads' two rearmost points
  // are 0.6 mm forward of the trace, inside its tolerance, to clear the built tail's base). A pad fills each front corner and
  // a slanting band crosses each back corner. Round the sensor, a rounded-square PTFE ring; and the name,
  // and the power switch on the left.
  feet: {
    front: [[8, 9], [9, 8], [11.8, 8.4], [14.5, 9.4], [17.2, 10.4], [19.9, 12], [22.7, 14.7], [24, 18], [24, 20.7], [22.7, 22.4], [19.9, 23.4], [17.2, 22], [14.5, 19.4], [11.8, 17.7], [9, 15.7], [8, 14.5]] as [number, number][],
    back: [[7.7, 101], [10.4, 98.5], [13.1, 97.5], [15.9, 96.2], [18.6, 94.5], [21.3, 92.9], [24, 91.5], [25.4, 92.2], [26, 94.5], [25.4, 97.2], [24, 99.5], [21.3, 103.2], [18.6, 105.9], [15.9, 107.9], [13.1, 109.6], [10.4, 110.3], [7.7, 110.6], [7.2, 106]] as [number, number][],
    sensor: { s: 56.4, w: 15, l: 16.8, r: 4.5, window: { w: 8.8, l: 9.8, r: 2.5 } },
    name: { s: 33.5, w: 27, h: 4.6 },
    power: { x: -14.8, s: 56.6, w: 4.5, l: 9 },
  },
} as const;

/** The references for the lab's overlay (?lab=mouse): the top view and the side profile. */
export const SORA_REFS = {
  top: { file: 'sora-top-pink.jpg', view: 'top' as const, up: '-z' as const, mmPerPx: 0.2129, cx: 400, floorY: 400, roi: [200, 90, 600, 710] as [number, number, number, number] },
  side: { file: 'sora-claw-panel.jpg', view: 'left' as const, mmPerPx: 0.0825, cx: 1342.4, floorY: 895, roi: [580, 400, 2068, 896] as [number, number, number, number], thr: 6, fill: 'down' as const },
  // Ninjutso's three-quarter render of the white one on blue, from behind its left shoulder: the only view
  // of the palm's cross-section; the lab finds the camera
  three: { file: 'sora-white-34.jpg', view: 'persp' as const, mmPerPx: 0, cx: 0, floorY: 0, channel: 'r' as const, thr: 110 },
};

/** Checks run by the lab: each is a measured quantity with a tolerance, in mm. */
export const SORA_CHECKS: { name: string; want: number; tol: number }[] = [
  { name: 'length', want: SORA.length, tol: 0.5 },
  { name: 'height', want: SORA.height, tol: 0.3 },
  { name: 'widest', want: 62.2, tol: 0.5 },
  { name: 'width 45 mm back (grip)', want: 60.5, tol: 0.6 },
  { name: 'width 10 mm back', want: 53.9, tol: 1.0 },
  { name: 'width 110 mm back', want: 43.9, tol: 1.0 },
  { name: 'hump peak from front', want: 72.6, tol: 2.5 },
  { name: 'height 20 mm back', want: 22.2, tol: 0.6 },
  { name: 'height 100 mm back', want: 29.1, tol: 0.6 },
  { name: 'seam from front, centre', want: SORA.seam.centre, tol: 0.5 },
  { name: 'wheel top above desk', want: SORA.wheel.top, tol: 0.5 },
  { name: 'nose undercut at the base', want: SORA.tuck.front, tol: 0.3 },
  { name: 'nose undercut 5.4 mm up', want: 3.5, tol: 0.3 },
  { name: 'edge height on the sides', want: SORA.edge.side, tol: 0.2 },
  { name: 'tail point height', want: SORA.edge.tail, tol: 0.5 },
  { name: 'tail chamfer meets the base', want: 113.9, tol: 0.8 },
  { name: 'side buttons past the outline (top view)', want: 1.0, tol: 0.3 },
  // the cross-section, against where the side render shows the side split
  { name: 'side split height 22 mm back', want: 20.2, tol: 1.0 },
  { name: 'side split height 30 mm back', want: 21.3, tol: 1.0 },
  { name: 'side split height 38 mm back', want: 23.3, tol: 1.0 },
  { name: 'seam end height on the side', want: 26.0, tol: 1.2 },
  // the traced skates sit on the built base, clear of its edge (the back ones come within about half a
  // millimetre of it at the tail, in the underside render)
  { name: 'skates: least clearance to the base edge', want: 0.6, tol: 0.6 },
];
