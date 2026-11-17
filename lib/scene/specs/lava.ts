// The classic 14.5 inch Lava lamp, in millimetres. lib/scene/props/lava-lamp.ts builds the lamp from
// these profiles and nothing else, and the model lab checks the built parts against them (?lab=lava).
//
// Sources
// - Official: 14.5 in (368 mm) tall, 25 W bulb (lavalamp.com FAQ and product pages); Lava publishes no
//   millimetre drawing.
// - Measured: the 14.5" lamp in Lava's own side-on size chart (lavalamp.com, 14.5-inch.png), which is a
//   flat side view. Scaled to 368 mm overall: 0.5227 mm/px on the 1500 x 2000 original, read to about
//   +-1 mm. As a body of revolution its outline is its radius profile, sampled every 5 mm.
// - Look: a lit classic lamp (Wikimedia Commons, Lavalamp_red.jpg): golden liquid brightest just above
//   the collar, red wax that is a domed pool at the bottom, blobs and necked columns rising, and a cluster
//   pressed under the cap; a bright ring where the glass leaves the collar; satin aluminium that picks up
//   the glow on the collar's top and the cap's lower edge.
//
// Shape: the base is an hourglass of two cones (17 degrees each) meeting at a 43 mm waist with a seam;
// the glass is widest at its heel just above the collar, then tapers straight at about 9.3 degrees, and
// the cap carries on the same taper. Axes: y up from the floor, the lamp centred on x = z = 0.

export const LAVA = {
  height: 368,
  base: {
    // [radius, height] from the floor up the outside: foot cone, the seam at the waist, the collar cone
    // and its lip, then down inside the collar's mouth
    profile: [
      [0, 0], [44.6, 0], [45.8, 1.2], [46, 3], [21.9, 79.9], [21.2, 80.5], [21.9, 81.1], [45.4, 156.2], [46, 156.6],
      [45.6, 157.1], [44.8, 157.1], [44.4, 150],
    ] as [number, number][],
    waist: { r: 21.7, y: 80.5 },
    top: 156.8,
  },
  glass: {
    // outside of the bottle, from inside the collar (hidden, and kept inside the collar's cone, whose
    // radius there is 21.9 + 0.313 (y - 81.1)) to the neck under the cap (hidden)
    profile: [
      [36, 138], [41, 147], [44, 154], [45.6, 157.5], [46.3, 161], [46.5, 165], [24.3, 307.9], [23.2, 311], [22.6, 316],
    ] as [number, number][],
    wall: 2,
    heel: { r: 46.5, y: 165 },
    top: { r: 24.3, y: 307.9 },
  },
  liquid: { bottom: 140, top: 309 }, // the wax's box: the bottle's floor (inside the collar) to just under the cap
  cap: {
    profile: [[22, 306.5], [24.9, 307.6], [15.4, 365.4], [14.4, 367], [13, 367.5], [0, 367.5]] as [number, number][],
    bottom: 307.6,
  },
} as const;

/** The reference for the lab's overlay: the 14.5" lamp in Lava's size chart (the other sizes are cropped out). */
export const LAVA_REFS = {
  chart: { file: 'lava-size-chart.png', view: 'front' as const, mmPerPx: 0.5227, cx: 371.2, floorY: 1588, roi: [256, 860, 486, 1600] as [number, number, number, number] },
};

/** Checks run by the lab: each is a measured quantity with a tolerance, in mm. */
export const LAVA_CHECKS: { name: string; want: number; tol: number }[] = [
  { name: 'overall height', want: 368, tol: 2 },
  { name: 'foot diameter', want: 92, tol: 2 },
  { name: 'waist diameter', want: 43.4, tol: 2 },
  { name: 'waist height', want: 80.5, tol: 2 },
  { name: 'collar top height', want: 156.8, tol: 2 },
  { name: 'collar top diameter', want: 91, tol: 2 },
  { name: 'glass widest diameter', want: 93, tol: 2 },
  { name: 'glass top diameter', want: 48.6, tol: 2 },
  { name: 'visible glass height', want: 151, tol: 2 },
  { name: 'cap height', want: 59.9, tol: 2 },
  { name: 'cap top diameter', want: 30.4, tol: 2 },
];
