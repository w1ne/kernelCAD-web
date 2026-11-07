// SPDX-License-Identifier: CC0-1.0
// Bumper car (dodgem): the two-seat electric car that bumps around a steel
// floor under a live ceiling grid.
// What makes it a bumper car rather than a go-kart: a fat moulded rubber
// bumper ring running all the way round a low chassis, a sculpted fibreglass
// shell that dips at the nose and rises into a tall rear cowl, an open
// cockpit with a padded bench and a big steering wheel on a raked column, and
// the tall sprung pickup pole at the back that touches the ceiling grid.
// Generic visualization geometry at about real size (about 2.0 m long,
// 1.3 m wide, 2.6 m to the pole tip), millimetres, Z up, nose toward +X,
// standing on z = 0.
meta({
  name: "bumper-car",
  license: "CC0-1.0",
  title: "Bumper car",
  description: "Two-seat dodgem at about real size: moulded rubber bumper ring round a low chassis, sculpted fibreglass shell with a dipped nose and tall rear cowl, accent stripe and headlamps, padded bench seat, steering wheel on a raked column, and a sprung pickup pole with ceiling-grid shoe. Material controls: fiberglass shell, enamel accent, upholstery, rubber bumper, stainless pole. Festival, twilight and retro presets.",
  tags: ["bumper car", "dodgem", "amusement park", "theme park", "fairground ride", "ride vehicle", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 4800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const fiberglass = param("fiberglass", "#c8302c", { label: "Painted fiberglass shell" });
const enamel = param("enamel", "#f2c230", { label: "Enamel stripe and lamps" });
const upholstery = param("upholstery", "#2a3c6e", { label: "Vinyl upholstery" });
const rubber = param("rubber", "#22272b", { label: "Rubber bumper and wheel" });
const stainlessSteel = param("stainlessSteel", "#c4cbcd", { label: "Stainless pole and column" });

presets({
  festival: { fiberglass: "#2f7fc1", enamel: "#f4f1e8", upholstery: "#d23b2f" },
  twilight: { fiberglass: "#6b3d8f", enamel: "#5fd1d8", upholstery: "#1d1f2a", stainlessSteel: "#8d9aa0" },
  retro: { fiberglass: "#e8dcc0", enamel: "#3a8f5c", upholstery: "#7a2f24", rubber: "#3a3532" },
});

const p = assembly("bumper-car");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Rounded rectangle in plan, extruded up from z0.
const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 6 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
// Side outline [[x, z], ...] extruded across Y, centred on y0.
const side = (pts, t: number, y0 = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2 + y0, 0);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Chassis pan and the drive/caster wheels tucked under it.
add("chassis", plan(rr(1780, 1040, 360), 50, 90).color(stainlessSteel));
for (const [x, y] of [[560, 0], [-560, 380], [-560, -380]]) {
  add(`wheel-${x > 0 ? "drive" : y > 0 ? "caster-left" : "caster-right"}`,
    turned([[0, -40], [60, -40], [70, -25], [70, 25], [60, 40], [0, 40]]).rotateX(90).translate(x, y, 70).color(rubber));
}

// Fat bumper ring: a tall lower roll with a narrower upper lip.
add("bumper-roll", plan(rr(2040, 1280, 520), 110, 170).subtract(plan(rr(1820, 1060, 410), 100, 190)).color(rubber));
add("bumper-lip", plan(rr(1980, 1220, 490), 280, 50).subtract(plan(rr(1820, 1060, 410), 270, 70)).color(rubber));

// Sculpted shell: side profile (low nose, tall rear cowl) cut to the rounded
// plan, with the open cockpit scooped out of the middle.
const shellSide = [
  [-940, 300], [960, 300], [985, 420], [930, 520], [760, 600], [420, 640], [-300, 640],
  [-560, 700], [-760, 880], [-900, 930], [-985, 820], [-985, 420],
];
const cockpit = plan(rr(1020, 900, 260), 470, 600).translate(-80, 0, 0);
add("shell", side(shellSide, 1100).intersect(plan(rr(1980, 1100, 420), 280, 700)).subtract(cockpit).color(fiberglass));
// Accent stripe proud of the shell, following its waist.
const stripeBand = plan(rr(2000, 1120, 430), 500, 46).subtract(plan(rr(1940, 1060, 400), 490, 66));
add("accent-stripe", stripeBand.intersect(side(shellSide.map(([x, z]) => [x * 1.02, z]), 1200)).color(enamel));
for (const s of [-1, 1]) {
  add(`headlamp-${s > 0 ? "left" : "right"}`, sphere(48).scale([0.6, 1, 1]).translate(965, s * 300, 430).color(enamel));
  add(`number-disc-${s > 0 ? "left" : "right"}`,
    turned([[0, 0], [130, 0], [130, 12], [0, 12]]).rotateX(s > 0 ? -90 : 90).translate(-760, s * 545, 690).color(enamel));
}

// Padded bench: cushion, rolled front edge and a backrest raked into the cowl.
add("seat-cushion", plan(rr(440, 820, 80), 470, 110).translate(-330, 0, 0).color(upholstery));
add("seat-roll", turned([[0, -410], [55, -410], [55, 410], [0, 410]]).rotateX(90).translate(-110, 0, 545).color(upholstery));
add("seat-back", side(filletPolygon([[-570, 560], [-470, 560], [-420, 930], [-530, 950]], 30), 820).color(upholstery));
add("floor-mat", plan(rr(560, 860, 80), 470, 20).translate(260, 0, 0).color(rubber));

// Dash hump, raked column and the big steering wheel.
add("dash", side(filletPolygon([[300, 470], [560, 470], [560, 660], [380, 690]], 40), 760).color(fiberglass));
const rake = 32;
const colBase: [number, number, number] = [420, 0, 640];
add("steering-column", turned([[0, 0], [24, 0], [24, 300], [0, 300]]).rotateY(-rake).translate(...colBase).color(stainlessSteel));
const hub: [number, number, number] = [colBase[0] - 300 * Math.sin((rake * Math.PI) / 180), 0, colBase[2] + 300 * Math.cos((rake * Math.PI) / 180)];
add("steering-wheel", torus(170, 20, 16).rotateY(-rake).translate(...hub).color(rubber));
add("steering-hub", turned([[0, -20], [45, -20], [45, 20], [0, 20]]).rotateY(-rake).translate(...hub).color(stainlessSteel));
for (let i = 0; i < 3; i++) {
  add(`steering-spoke-${i}`, box(150, 18, 14, true).translate(85, 0, 0).rotateZ(90 + i * 120).rotateY(-rake).translate(...hub).color(stainlessSteel));
}

// Sprung pickup pole: rubber boot, steel mast, coil spring and ceiling shoe.
const poleX = -840;
add("pole-boot", turned([[0, 0], [80, 0], [60, 160], [32, 200], [0, 200]]).translate(poleX, 0, 860).color(rubber));
add("pole-mast", turned([[0, 0], [22, 0], [22, 1500], [0, 1500]]).translate(poleX, 0, 1000).color(stainlessSteel));
for (let i = 0; i < 6; i++) add(`pole-spring-${i}`, torus(40, 9, 12).translate(poleX, 0, 2420 + i * 26).color(stainlessSteel));
add("pole-tip", turned([[0, 0], [16, 0], [16, 120], [0, 120]]).translate(poleX, 0, 2560).color(stainlessSteel));
add("pickup-shoe", side(filletPolygon([[-120, 0], [120, 0], [90, 40], [-90, 40]], 10), 70).translate(poleX, 0, 2680).color(enamel));

return p.model();
