// SPDX-License-Identifier: CC0-1.0
// Split cable duct: an HDPE conduit split lengthwise into two half shells, so it can be closed
// around cables that are already in place. The halves meet on flat side flanges held by stainless
// bolts and nuts; three black cables run through the bore and out of both ends.

meta({
  name: "split-cable-duct",
  license: 'CC0-1.0',
  title: "Split cable duct",
  description: "Split cable duct: a 150 mm HDPE conduit split lengthwise into upper and lower half shells that close around existing cables. The halves meet on flat side flanges held by six stainless bolts and nuts; three black cables run through the bore and out of both ends. Material controls: HDPE duct, stainless steel, black polymer cable. Field-site and high-visibility presets.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 1200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const duct = param('duct', '#e07a1f', { label: 'Split duct (HDPE)' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Flange bolts and nuts (stainless steel)' });
const polymer = param('polymer', '#22292d', { label: 'Cables (black polymer)' });
presets({
  fieldSite: {
    duct: '#2e3331',
    stainlessSteel: '#d0d9d6',
    polymer: '#3b4a3f',
  },
  highVisibility: {
    duct: '#e8c21a',
    stainlessSteel: '#e4e9e6',
    polymer: '#1d2224',
  },
});

const L = 500; // duct length along Y
const R = 75; // outer radius
const r = 67; // bore radius
const F = 24; // flange width outside the shell
const T = 7; // flange thickness per half
const ZC = R; // duct axis height: the lower shell rests on the ground
const N = 12; // facets per half circle

// Profile [[x, z], ...] in the XZ plane, extruded along Y over the duct length.
const alongY = (pts: [number, number][], y0: number, y1: number) => {
  let pb = path().moveTo(pts[0]![0], pts[0]![1]);
  for (const [x, z] of pts.slice(1)) pb = pb.lineTo(x, z);
  return pb.close().extrude(y1 - y0).rotateX(90).translate(0, y1, 0).scale(scale);
};
// One half shell with its two flanges; side = 1 for the upper half, -1 for the lower half.
const halfShell = (side: 1 | -1) => {
  const a0 = Math.asin(T / R);
  const pts: [number, number][] = [[R + F, ZC], [R + F, ZC + side * T]];
  for (let i = 0; i <= N; i++) {
    const a = a0 + ((Math.PI - 2 * a0) * i) / N;
    pts.push([R * Math.cos(a), ZC + side * R * Math.sin(a)]);
  }
  pts.push([-R - F, ZC + side * T], [-R - F, ZC]);
  for (let i = 0; i <= N; i++) {
    const a = Math.PI - (Math.PI * i) / N;
    pts.push([r * Math.cos(a), ZC + side * r * Math.sin(a)]);
  }
  // Mirroring the lower half flips the winding; reverse it to keep one orientation.
  return alongY(side === 1 ? pts : pts.reverse(), -L / 2, L / 2);
};
const c = (x: number, y: number, z: number, h: number, rad: number, n = 6) => cylinder(h, rad, n).translate(x, y, z).scale(scale);

const p = assembly("split-cable-duct");
p.part("shell-upper", halfShell(1).color(duct));
p.part("shell-lower", halfShell(-1).color(duct));
// Six flange bolts: hex heads on the upper flange, nuts under the lower flange.
let i = 0;
for (const x of [-(R + F / 2), R + F / 2]) {
  for (const y of [-170, 0, 170]) {
    p.part(`bolt-${i}`, c(x, y, ZC + T, 8, 9).color(stainlessSteel));
    p.part(`nut-${i}`, c(x, y, ZC - T - 8, 8, 9).color(stainlessSteel));
    i++;
  }
}
// Three cables lie in the bore and leave both open ends.
for (const [j, [x, z]] of ([[-29, ZC - 40], [0, ZC - 50], [29, ZC - 40]] as const).entries()) {
  p.part(`cable-${j}`, cylinder(L + 120, 14, 8).rotateX(90).translate(x, L / 2 + 60, z).scale(scale).color(polymer));
}

return p.model();
