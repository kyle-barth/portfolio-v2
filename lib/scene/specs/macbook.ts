// MacBook Pro with PROLED XDR Display, 14-inch (2026), Space Black, in millimetres.
// lib/scene/props/macbook.ts builds the laptop from these numbers and nothing else, and the model lab
// checks the built parts against them (?lab=macbook, __labCheck, __labOverlay).
//
// Sources
// - Official (Apple's tech specs page): 310.8 x 216.3 x 15.0 mm closed; 14.2 in tandem OLED, 3024 x 1986
//   at 254 ppi, so a 302.4 x 198.6 mm panel; Dynamic Island; 78 keys with 12 full-height function keys;
//   MagSafe 3, two Thunderbolt 5 and the headphone jack on the left, SDXC, Thunderbolt 5 and HDMI on the right.
// - Measured: the straight-on renders on that page (Apple's; they stay out of the repo, the lab fetches them
//   from its local receiver). Scales from the official sizes:
//   - closed lid from above: 912 px across for 310.8 mm, 0.3408 mm/px (depth comes out at 216.4: check);
//   - closed, from the front: 0.3386 mm/px; the body reads 14.7 mm tall there, so heights are split in
//     its proportions (lid 22.5%) and scaled to the official 15.0;
//   - left and right sides (cropped close-ups): the body's 15.0 mm over 97.5 and 95.5 px, 0.1538 and
//     0.1571 mm/px; port sizes come out right (Thunderbolt 8.3 mm, the jack 3.5 mm);
//   - the open deck from above: 936 px across, 0.3321 mm/px;
//   - the screen face-on (product image): 409.5 px across the lid, 0.759 mm/px.
//   Read to about +-0.5 px: +-0.2 mm on the deck, +-0.1 mm on the sides.
// - Not in any reference: where the side intake slots end toward the front (estimated), the hinge
//   (the barrel's width is measured; its size and the lid's pivot are a sensible guess), and the
//   front feet (assumed to mirror the back pair, whose position is measured).
//
// Axes: x to the user's right, y up from the desk (the feet stand on y = 0), z toward the user. The
// closed footprint is centred on x = z = 0. Apple's 15.0 mm height is the body without its feet.

export const MBP = {
  w: 310.8, d: 216.3, h: 15.0,
  cornerR: 10.6, // plan corners, lid and base alike (31-32 px at 0.3408)
  feet: { d: 16.4, h: 1.7, x: 128.6, fromBack: 26, fromFront: 26 },
  base: {
    h: 11.5,
    // The edge, all the way round, from the deck down: [inset from the outline, height above the
    // base's underside]. Straight for the top 4.2 mm, then a long tuck: 6.5 mm in at 0.4 mm up.
    // Measured the same on the sides (front view) and the back (side view).
    profile: [
      [0.35, 11.5], [0.08, 11.42], [0, 11.25], [0, 7.3], [0.15, 6.4], [0.3, 5.5], [0.46, 5.0], [0.6, 4.5], [0.9, 4.1],
      [1.1, 3.6], [1.4, 3.15], [1.7, 2.7], [2.2, 2.2], [2.8, 1.77], [3.4, 1.3], [4.5, 0.85], [5.6, 0.55], [6.5, 0.38], [7.0, 0.15], [7.1, 0],
    ] as [number, number][],
    // finger scoop in the middle of the front edge: 54.2 wide, 1.5 deep at the edge, reaching 3 mm into the deck
    scoop: { w: 54.2, depth: 1.5, reach: 3.0, endR: 2.7 },
    // intake slots low on both sides, on the tuck: from 88 mm behind the back edge forward
    intake: { fromBack: 88.2, toFront: 30, y: 3.2, h: 1.25 }, // toFront: estimated
  },
  lid: {
    t: 3.5,
    // its edge: outer (back) face rounded 1.0 mm, inner (screen) face 0.4 mm
    outerR: 1.0, innerR: 0.4,
    rim: 0.9, // aluminium visible round the glass, face-on
    logo: { w: 37.8, h: 46.0, z: 3.75 }, // on the back, leaf to base; centre toward the lid's top edge
  },
  display: {
    w: 302.4, h: 198.6,
    bezel: 4.2, // sides and top, from the lid's edge to the panel
    topR: 7.4, bottomR: 1.5, // the panel's corners
    island: { w: 10.6, h: 5.7, top: 2.3 }, // Dynamic Island, below the panel's top edge
  },
  // The lid turns about an axis inside the base, 4.5 mm under the deck and 1 mm in from the back, so its
  // lower edge drops behind the base as it opens: at 108 degrees 6.3 mm of glass shows above the deck
  // under the panel (6.3 to 6.8 mm in the face-on renders). The dark hinge cover is the lid's lower edge
  // across the middle, 205.2 mm wide (measured from above); the pivot itself is a fit to that chin.
  hinge: {
    w: 205.2, cover: 1.73, axisDrop: 4.5, axisIn: 1.0, // cover: the lid's edge bar, just inside its 3.5 mm
    // From above, the back of the deck: a black bar 3 mm deep set into the edge across the middle, and
    // a 4 mm notch either side for the hinge arms (|x| 103 to 118.5 mm). Their depth into the base is a guess.
    bar: { r: 1.5 }, arms: { x0: 103, x1: 118.5, depth: 4.0, drop: 6.0 },
  },
  deck: {
    well: { x: 139.5, z0: -92.2, z1: 22.5, r: 2.0, depth: 1.1 }, // keyboard well: |x| <= 139.5
    keyR: 1.2, keyTop: 0.25, // key corner radius; key tops sit this far below the deck
    trackpad: { w: 124.2, z0: 25.5, z1: 103.5, r: 4.0 },
    grille: { x0: 140.1, x1: 154.1, z0: -88.3, z1: 17.3, pitch: 0.9, hole: 0.55 }, // both sides, mirrored
  },
  // Key rows as measured, front-to-back extents [z0, z1] and keys [label, x0, x1]; the arrows' up and
  // down share a column, left and right are the lower half. Pitch 18.9 mm across, 18.5 mm front to back.
  keys: [
    { z: [-89.1, -73.1], keys: [['esc', -136.1, -110.2], ['F1', -107.9, -91.3], ['F2', -89, -72.4], ['F3', -69.7, -53.5], ['F4', -50.8, -34.5], ['F5', -31.9, -15.6], ['F6', -12.9, 3.3], ['F7', 6, 22.6], ['F8', 24.9, 41.5], ['F9', 44.2, 60.4], ['F10', 63.1, 79.4], ['F11', 82, 98.3], ['F12', 100.9, 117.2], ['touchid', 119.9, 136.1]] },
    { z: [-70.8, -54.9], keys: [['`', -136.1, -119.9], ['1', -117.2, -100.9], ['2', -98.3, -82], ['3', -79.4, -63.1], ['4', -60.4, -43.8], ['5', -41.5, -24.9], ['6', -22.6, -6], ['7', -3.3, 12.9], ['8', 15.6, 31.9], ['9', 34.5, 50.8], ['0', 53.5, 69.7], ['-', 72.4, 89], ['=', 91.3, 107.9], ['delete', 110.6, 136.1]] },
    { z: [-52.2, -36.3], keys: [['tab', -136.1, -110.2], ['Q', -107.9, -91.3], ['W', -89, -72.4], ['E', -69.7, -53.5], ['R', -50.8, -34.5], ['T', -31.9, -15.6], ['Y', -12.9, 3.3], ['U', 6, 22.6], ['I', 24.9, 41.5], ['O', 43.8, 60.4], ['P', 63.1, 79.4], ['[', 82, 98.3], [']', 100.9, 117.2], ['\\', 119.9, 136.5]] },
    { z: [-34, -17.7], keys: [['caps', -136.1, -105.6], ['A', -102.9, -86.7], ['S', -84, -67.7], ['D', -65.1, -48.8], ['F', -46.2, -29.9], ['G', -27.2, -10.6], ['H', -8.3, 8.3], ['J', 10.6, 27.2], ['K', 29.9, 46.2], ['L', 48.8, 65.1], [';', 67.7, 84], ["'", 86.7, 102.9], ['return', 105.6, 136.1]] },
    { z: [-15.4, 0.6], keys: [['shift', -136.1, -96.3], ['Z', -93.6, -77], ['X', -74.7, -58.1], ['C', -55.5, -39.2], ['V', -36.5, -20.3], ['B', -17.6, -1.3], ['N', 1.3, 17.6], ['M', 20.3, 36.5], [',', 39.2, 55.8], ['.', 58.1, 74.7], ['/', 77.4, 93.6], ['rshift', 96.3, 136.1]] },
    { z: [3.2, 19.2], keys: [['fn', -136.1, -119.9], ['control', -117.2, -100.9], ['option', -98.3, -82], ['command', -79.4, -58.1], ['space', -55.5, 36.5], ['rcommand', 39.2, 60.4], ['roption', 63.1, 79.4]] },
    { z: [11.5, 19.2], keys: [['left', 82.3, 98.3], ['down', 100.9, 117.5], ['right', 120.2, 136.1]] },
    { z: [3.2, 10.9], keys: [['up', 100.9, 117.5]] },
  ] as { z: [number, number]; keys: [string, number, number][] }[],
  // Ports: centre in mm from the back edge, opening width x height and corner radius; all centred
  // 7.55 mm above the base's underside (7.66 left, 7.46 right).
  ports: {
    y: 7.55,
    left: [
      { name: 'MagSafe 3', at: 26.3, w: 15.4, h: 2.6, r: 1.3 },
      { name: 'Thunderbolt', at: 44.3, w: 8.3, h: 2.5, r: 1.25 },
      { name: 'Thunderbolt', at: 58.9, w: 8.3, h: 2.5, r: 1.25 },
      { name: 'headphone jack', at: 71.4, w: 3.5, h: 3.5, r: 1.75 },
    ],
    right: [
      { name: 'HDMI', at: 26.7, w: 14.4, h: 3.5, r: 0.6 },
      { name: 'Thunderbolt', at: 45.0, w: 8.3, h: 2.5, r: 1.25 },
      { name: 'SDXC', at: 69.4, w: 26.0, h: 2.5, r: 1.0 },
    ],
  },
} as const;

/**
 * The references for the lab's overlay (?lab=macbook-closed for the four closed views, ?lab=macbook
 * for the deck). mmPerPx, cx (the pixel column of x = 0, or of z = 0 seen from the side) and floorY
 * (the pixel row of the desk, y = 0; seen from above, the row of z = 0). Seen from above, `up` says
 * which way the top of the image points: +z is the laptop's front, -z its back.
 */
export const MBP_REFS = {
  top: { file: 'mbp-dimensions_1_14_inch.jpg', view: 'top' as const, up: '+z' as const, mmPerPx: 0.3408, cx: 458.5, floorY: 319, roi: [0, 0, 930, 648] as [number, number, number, number] },
  front: { file: 'mbp-dimensions_2_14_inch.jpg', view: 'front' as const, mmPerPx: 0.3386, cx: 460.5, floorY: 50.5, roi: [0, 0, 932, 54] as [number, number, number, number] },
  left: { file: 'mbp-ports_1_14_inch.jpg', view: 'left' as const, mmPerPx: 0.1538, cx: 705.7, floorY: 127.6, roi: [0, 0, 820, 128] as [number, number, number, number] },
  right: { file: 'mbp-ports_2_14_inch.jpg', view: 'right' as const, mmPerPx: 0.1571, cx: 128.1, floorY: 124.3, roi: [0, 0, 820, 125] as [number, number, number, number] },
  deck: { file: 'mbp-keyboard_14_inch.jpg', view: 'top' as const, up: '-z' as const, mmPerPx: 0.3321, cx: 569.5, floorY: 347.85, roi: [95, 26, 1045, 688] as [number, number, number, number] },
};

/** Checks run by the lab: each is a measured quantity with a tolerance, in mm. */
export const MBP_CHECKS: { name: string; want: number; tol: number }[] = [
  { name: 'width', want: MBP.w, tol: 0.5 },
  { name: 'depth', want: MBP.d, tol: 0.5 },
  { name: 'closed height', want: MBP.h, tol: 0.3 },
  { name: 'base height', want: MBP.base.h, tol: 0.3 },
  { name: 'lid thickness', want: MBP.lid.t, tol: 0.2 },
  { name: 'feet height', want: MBP.feet.h, tol: 0.2 },
  { name: 'underside inset', want: 7.1, tol: 0.4 },
  { name: 'keyboard well width', want: 279, tol: 0.6 },
  { name: 'keyboard well depth', want: 114.7, tol: 0.6 },
  { name: 'key pitch across', want: 18.9, tol: 0.2 },
  { name: 'key pitch front to back', want: 18.5, tol: 0.3 },
  { name: 'letter key width', want: 16.6, tol: 0.4 },
  { name: 'space bar width', want: 92, tol: 0.6 },
  { name: 'trackpad width', want: MBP.deck.trackpad.w, tol: 0.5 },
  { name: 'trackpad depth', want: 78, tol: 0.5 },
  { name: 'trackpad front from edge', want: 4.65, tol: 0.4 },
  { name: 'panel width', want: MBP.display.w, tol: 0.5 },
  { name: 'panel height', want: MBP.display.h, tol: 0.5 },
  { name: 'side bezel', want: MBP.display.bezel, tol: 0.3 },
  { name: 'Dynamic Island width', want: MBP.display.island.w, tol: 0.4 },
  { name: 'scoop width', want: MBP.base.scoop.w, tol: 0.6 },
  { name: 'MagSafe from back', want: 26.3, tol: 0.4 },
  { name: 'HDMI from back', want: 26.7, tol: 0.4 },
  { name: 'SDXC from back', want: 69.4, tol: 0.4 },
  { name: 'port centre height', want: MBP.ports.y + MBP.feet.h, tol: 0.3 },
  { name: 'chin above the deck at 108°', want: 6.5, tol: 0.5 },
];
