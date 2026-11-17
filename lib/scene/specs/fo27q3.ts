// Gigabyte AORUS FO27Q3 (27" QD-OLED), in millimetres. lib/scene/props/monitor.ts builds the monitor
// from these numbers and nothing else, and the model lab checks the built parts against them (?lab=monitor).
//
// Sources
// - Official (gigabyte.com): 610.3 x 356.4 x 57.2 mm without the stand; with it 532.5 tall and 158.6 deep;
//   viewing area 590.42 x 333.72; height adjustment 130 mm; tilt -5 to +20 degrees.
// - Measured: Gigabyte's straight-on front render (0.3826 mm/px from the 610.3 width; its panel then
//   measures 356.6 tall, against 356.4), and its top and bottom views of the head (the edge, the bar,
//   the housing's plan, the boss, hub and arm). The rear and side renders are in perspective close up,
//   so their depths are read at the panel's plane and cross-checked against the top and bottom views.
// - Judged, from the three-quarter renders to about +-3 mm: the housing's facets beyond its outline, the
//   legs' width and the hub collar's height.
// - Not settled: how far the legs reach. The renders put the tips about 65 mm in front of the panel
//   (the side render's near tip, allowing for its camera); the spec sheet's 158.6 deep would need 29.
//   The renders win here.
//
// The front render shows the panel 548 mm up at its top (15 mm above the official 532.5, likely its
// perspective at the floor). On the desk it stands lower: the screen's centre 275 mm up, its top 447.
//
// Axes: x to the right, y up from the desk, z toward the viewer; the panel's front face at z = 0 and the
// screen centred on x = 0. The stand is drawn as it stands under the render's panel; the head slides
// down its leaning pillar to the desk's setting.

export const FO27 = {
  panel: {
    w: 610.3, h: 356.4,
    // the OLED module is 6 mm deep, 4.4 at its very top edge; behind it the back swells to 12.4 across
    // the middle (|x| <= 256), easing back to the module by |x| = 292 (top view: 585 wide at 6.6 deep,
    // 534 at 10.7), and up the top 75 mm it slopes back in to the module
    top: 4.4, module: 6, back: 12.4, backW: 256, edgeW: 292, slope: 75,
    // a bar along the bottom, 13 deep (bottom view: 11.8 to 13.4), its ends tapering in plan from 599
    // wide at 6 mm deep to 527 at 12; and a block behind it, centred, 340 wide at the bottom edge,
    // narrowing to 300 where the housing meets it, 26 deep
    bar: { h: 58, d: 13, wFront: 599, wBack: 527 },
    block: { w: 340, wTop: 300, d: 26 },
  },
  // the active area: centred across, 17.2 mm above the panel's bottom edge, 5.5 under its top; the glass
  // (black where the picture stops) runs down to 15.7 mm, and below it the chin is a satin band of its
  // own; a light rim 1.1 mm wide frames the top and sides
  screen: { w: 590.42, h: 333.72, bottom: 17.2 },
  chin: { h: 15.7, logo: { w: 46.7, h: 7.7, y: 8.8 } },
  rim: 1.1,
  // the electronics housing on the back: 430 wide (top view); its top 73 mm below the panel's top at
  // the front, 84 at the back; its back nearly upright, [mm below the top, depth] at the centre; its
  // plan bowed, [x, depth at its deepest]: the outer sides at +-215 only 36 deep
  housing: {
    w: 430, top: [73, 84],
    back: [[84, 47], [190, 50], [220, 53], [287, 46]] as [number, number][],
    plan: [[0, 54], [145, 52], [188, 44], [215, 36]] as [number, number][],
    // The back is two raised wing plates either side of a lower, ribbed centre (the rear renders, their
    // heights read with the renders' close camera allowed for, +-10 mm): each wing [|x|, mm below the
    // top] from its outer top corner round to its outer bottom, its inner edge running down and in;
    // the centre panel sits `rise` below them. Light lines: blue along each wing's fold, purple along
    // the bottom of the centre panel.
    wing: { outline: [[215, 84], [151, 84], [84, 233], [198, 287], [215, 287]] as [number, number][], rise: 5 },
    lights: { wing: { below: 228, x: [88, 173] }, centre: { below: 233, x: 95 } },
    // the AORUS light window along its top back edge, 297 x 16: smoked glass, an RGB line along each
    // long edge, the wordmark lit purple (reading the right way round from behind)
    strip: { w: 297, d: [31, 47], logo: [60, 12] },
  },
  // the VESA boss: a ring 76 to 100 across, flush with the back at 50 and out to 55; the stand's
  // quick-release hub on it, 76 across from 55 to 63 deep, tapering to 52 across at 75; its arm on to
  // the pillar, 14 wide and 13.5 tall
  vesa: { ring: [76, 100], depth: [50, 55], below: 190, hub: { d: [76, 52], z: [63, 75] }, arm: { w: 14, h: 13.5 } },
  // the stand: a pillar 65.4 wide that leans back (its front 65 mm behind the panel at the hub, 100.5 at
  // its top, 408.5 up); 40 deep at the foot, 37 at the top, its top cut sloping up to the back by 9.3 and
  // its top front edge bevelled 7 x 10; a cable slot down its front with rounded ends, and an AORUS
  // plate at its foot: dark glass edged in blue
  pillar: {
    w: 65.4, foot: { y: 26, z: -65, d: 40 }, top: { y: 408.5, z: -100.5, d: 37, slope: 9.3, bevel: [7, 10] },
    slot: { w: 13.4, rim: 19, top: 30, bottom: 47.8 }, // top: mm below the pillar's top; bottom: mm up
    plate: { y: [14.5, 35.6], w: [30, 40] },
  },
  // the base: a collar 99.5 across with a chamfered top on a 137.7 x 90 plinth, 14.5 mm up, centred 85
  // behind the panel; two legs out to tips 276.5 either side, 65 in front of the panel: even blades,
  // 14 mm thick at the hub to 10 at the tips, five raised ribs along their tops
  base: {
    hub: { d: 99.5, plinth: 137.7, depth: 90, h: 14.5, z: -85 },
    tip: { x: 276.5, z: 65 },
    leg: { w: [32, 22], t: [14, 10], ribs: 5, rib: [1.2, 0.6] },
  },
  // on the desk: the screen's centre 275 mm up, so the panel's bottom stands 90.9 mm up
  head: { bottom: 90.9, renderBottom: 548 - 356.4 },
} as const;

/** The references for the lab's overlays (?lab=monitor, which stands the head at the render's height). */
export const FO27_REFS = {
  front: { file: 'fo27q3-39712.png', view: 'front' as const, mmPerPx: 0.3826, cx: 798, floorY: 1433, roi: [0, 0, 1596, 1503] as [number, number, number, number] },
  back: { file: 'fo27q3-39823.png', view: 'back' as const, mmPerPx: 0.3882, cx: 786.5, floorY: 1412.6, roi: [0, 0, 1573, 1488] as [number, number, number, number] },
  // the front three-quarter renders (the monitor is symmetric, so either side fits either)
  three: { file: 'fo27q3-39711.png', view: 'persp' as const, mmPerPx: 0, cx: 0, floorY: 0, yaw: [-80, 80] as [number, number] },
  three2: { file: 'fo27q3-39713.png', view: 'persp' as const, mmPerPx: 0, cx: 0, floorY: 0, yaw: [-80, 80] as [number, number] },
};

/** Checks run by the lab: each is a measured quantity with a tolerance, in mm (or degrees). */
export const FO27_CHECKS: { name: string; want: number; tol: number }[] = [
  { name: 'panel width', want: FO27.panel.w, tol: 0.5 },
  { name: 'panel height', want: FO27.panel.h, tol: 0.5 },
  { name: 'screen width', want: FO27.screen.w, tol: 0.3 },
  { name: 'screen height', want: FO27.screen.h, tol: 0.3 },
  { name: 'chin (screen above the panel bottom)', want: FO27.screen.bottom, tol: 0.4 },
  { name: 'chin band height', want: FO27.chin.h, tol: 0.3 },
  { name: 'depth without the stand', want: 57.2, tol: 2.5 },
  { name: 'bottom bar depth', want: FO27.panel.bar.d, tol: 0.5 },
  { name: 'panel edge depth (top view, at 585 wide)', want: 6.6, tol: 0.8 },
  { name: 'housing width', want: FO27.housing.w, tol: 1 },
  { name: "height at the render's setting", want: 548, tol: 2 },
  { name: 'base, tip to tip', want: 2 * FO27.base.tip.x, tol: 2 },
  { name: 'leg tips in front of the panel', want: FO27.base.tip.z, tol: 1 },
  { name: 'pillar width', want: FO27.pillar.w, tol: 0.5 },
  { name: 'pillar lean (degrees)', want: 5.3, tol: 0.5 },
  { name: 'arm width', want: FO27.vesa.arm.w, tol: 0.5 },
  { name: 'screen centre above the desk (scene)', want: 275, tol: 1 },
];
