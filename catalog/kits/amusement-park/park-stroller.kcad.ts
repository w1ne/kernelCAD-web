// SPDX-License-Identifier: CC0-1.0
// Park stroller: the single-seat rental pushchair a family picks up at the
// stroller stand by the gate.
// What makes it a stroller rather than a chair on wheels: an aluminium
// A-frame of raked tube legs meeting at a hinge block, a reclined fabric
// sling seat with a footrest and a padded bumper bar, a domed folding hood
// with a trimmed opening, a foam-gripped push handle, a shopping basket slung
// under the seat, two big rear wheels and swivel twin front wheels.
// Generic visualization geometry at about real size (about 0.9 m long,
// 0.6 m wide, 1.1 m to the handle), millimetres, Z up, the child faces -Y,
// standing on its tyres at z = 0.
meta({
  name: "park-stroller",
  license: "CC0-1.0",
  title: "Park stroller",
  description: "Single-seat rental park stroller at about real size: raked aluminium A-frame legs with hinge blocks, reclined fabric sling seat with footrest and padded bumper bar, domed folding hood with trimmed opening, foam-gripped push handle, under-seat shopping basket, big rear wheels and swivel twin front wheels. Material controls: anodised aluminium, seat and hood fabric, plastic trim, rubber tyres. Festival, twilight and rental-fleet presets.",
  tags: ["stroller", "pushchair", "buggy", "pram", "rental stroller", "amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 6000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const aluminum = param("aluminum", "#b8c2c4", { label: "Anodised aluminium frame" });
const fabric = param("fabric", "#c77786", { label: "Seat sling and hood fabric" });
const plastic = param("plastic", "#2e3a40", { label: "Hood trim, hubs, hinges and basket" });
const rubber = param("rubber", "#292f33", { label: "Rubber tyres and foam grip" });

presets({
  festival: { aluminum: "#c9cec9", fabric: "#e4b765", plastic: "#2f6fb8", rubber: "#3c4245" },
  twilight: { aluminum: "#718a94", fabric: "#557b8a", plastic: "#2a2f45", rubber: "#20262a" },
  rentalFleet: { aluminum: "#d8dcdc", fabric: "#2f7d4f", plastic: "#e0a033", rubber: "#26292c" },
});

const p = assembly("park-stroller");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// A round tube from a to b, both in the plane x = const.
const rodYZ = (x: number, a: [number, number], b: [number, number], r: number) => {
  const dy = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.sqrt(dy * dy + dz * dz);
  return cylinder(len, r, 10).rotateX((-Math.atan2(dy, dz) * 180) / Math.PI).translate(x, a[0], a[1]);
};

const RW = 140;
const REAR: [number, number] = [230, RW];
const FRONT: [number, number] = [-330, 85];
const HINGE: [number, number] = [-40, 560];
const HANDLE: [number, number] = [400, 1060];
const XR = 250;
const XF = 210;

// Rear wheels: tyre, hub and axle.
for (const sx of [-1, 1]) {
  const s = sx < 0 ? "l" : "r";
  add(`rear-tyre-${s}`, torus(RW - 24, 24, 24).rotateY(90).translate(sx * (XR + 20), REAR[0], RW).color(rubber));
  add(`rear-hub-${s}`, cylinder(40, RW - 40, 18).rotateY(90).translate(sx * (XR + 20) - 20, REAR[0], RW).color(plastic));
  add(`rear-cap-${s}`, cylinder(30, 34, 12).rotateY(90).translate(sx > 0 ? XR + 40 : -XR - 70, REAR[0], RW).color(aluminum));
}
add("rear-axle", cylinder(2 * XR + 40, 12, 8).rotateY(90).translate(-XR - 20, REAR[0], RW).color(aluminum));

// Swivel twin front wheels under a caster fork.
for (const sx of [-1, 1]) {
  const s = sx < 0 ? "l" : "r";
  for (const dx of [-35, 35]) add(`front-tyre-${s}-${dx < 0 ? "i" : "o"}`, torus(FRONT[1] - 18, 18, 18).rotateY(90).translate(sx * XF + dx, FRONT[0], FRONT[1]).color(rubber));
  add(`front-hub-${s}`, cylinder(90, 30, 10).rotateY(90).translate(sx * XF - 45, FRONT[0], FRONT[1]).color(plastic));
  add(`caster-fork-${s}`, box(40, 70, 90, true).translate(sx * XF, FRONT[0] + 20, FRONT[1] + 85).color(plastic));
}

// Aluminium A-frame: rear legs, front legs, hinge blocks, cross tubes.
for (const sx of [-1, 1]) {
  const s = sx < 0 ? "l" : "r";
  add(`rear-leg-${s}`, rodYZ(sx * XR, REAR, HANDLE, 16).color(aluminum));
  add(`front-leg-${s}`, rodYZ(sx * XF, [FRONT[0] + 20, FRONT[1] + 130], HINGE, 15).color(aluminum));
  add(`hinge-${s}`, box(50, 110, 90, true).translate(sx * (XR - 10), HINGE[0] + 50, HINGE[1] + 10).color(plastic));
  add(`seat-rail-${s}`, rodYZ(sx * (XR - 30), [HINGE[0] + 50, HINGE[1]], [REAR[0] + 40, 460], 12).color(aluminum));
}
add("front-cross", cylinder(2 * XF, 12, 8).rotateY(90).translate(-XF, FRONT[0] + 30, FRONT[1] + 150).color(aluminum));
add("rear-cross", cylinder(2 * XR, 12, 8).rotateY(90).translate(-XR, REAR[0] + 30, 300).color(aluminum));

// Push handle with a foam grip.
add("handle-bar", cylinder(2 * XR, 16, 10).rotateY(90).translate(-XR, HANDLE[0], HANDLE[1]).color(aluminum));
add("handle-grip", cylinder(2 * XR - 80, 24, 12).rotateY(90).translate(-XR + 40, HANDLE[0], HANDLE[1]).color(rubber));

// Fabric sling seat: seat pan, reclined back, footrest, bumper bar.
const SW = 2 * XR - 90;
add("seat-pan", extrudeRoundedRect(SW, 300, 40, 50, { axis: "y" }).rotateX(90 + 8).translate(0, 120, 520).color(fabric));
add("backrest", extrudeRoundedRect(SW, 480, 60, 50, { axis: "y" }).rotateX(-18).translate(0, 130, 760).color(fabric));
add("seat-wing-l", extrudePolygon([[-60, 0], [220, 0], [220, 360], [80, 360]], 20).rotateX(90).rotateZ(90).translate(-SW / 2 - 20, 0, 520).color(fabric));
add("seat-wing-r", extrudePolygon([[-60, 0], [220, 0], [220, 360], [80, 360]], 20).rotateX(90).rotateZ(90).translate(SW / 2, 0, 520).color(fabric));
add("calf-rest", extrudeRoundedRect(SW, 220, 30, 30, { axis: "y" }).rotateX(25).translate(0, -170, 380).color(fabric));
add("footrest", box(SW + 20, 110, 24, true).translate(0, -230, 300).color(plastic));
add("bumper-bar", cylinder(SW + 40, 26, 12).rotateY(90).translate(-SW / 2 - 20, -150, 720).color(fabric));
for (const sx of [-1, 1]) add(`bumper-post-${sx < 0 ? "l" : "r"}`, rodYZ(sx * (SW / 2 + 10), [-60, 560], [-150, 720], 12).color(plastic));

// Domed folding hood with a trimmed front opening.
const HY = 210;
const HZ = 900;
const HR = 300;
const OPEN_Y = HY - 160;
const hood = sphere(HR).subtract(sphere(HR - 14)).scale([1, 1.1, 0.95]).translate(0, HY, HZ)
  .intersect(box(2 * HR + 40, 2 * HR, HR + 20, true).translate(0, OPEN_Y + HR, HZ + (HR + 20) / 2 - 20));
add("hood", hood.color(fabric));
const trimR = Math.sqrt(HR * HR - ((HY - OPEN_Y) / 1.1) ** 2);
add("hood-trim", torus(trimR, 14, 24).rotateX(90).scale([1, 1, 0.95]).translate(0, OPEN_Y, HZ)
  .intersect(box(2 * trimR + 60, 60, trimR + 40, true).translate(0, OPEN_Y, HZ + (trimR + 40) / 2 - 20)).color(plastic));
for (const sx of [-1, 1]) add(`hood-pivot-${sx < 0 ? "l" : "r"}`, cylinder(30, 34, 12).rotateY(90).translate(sx > 0 ? HR - 14 : -HR - 16, HY, HZ - 10).color(plastic));

// Shopping basket slung under the seat.
add("basket", box(SW, 360, 150, true).translate(0, 60, 300).subtract(box(SW - 30, 330, 150, true).translate(0, 60, 330)).color(plastic));

return p.model();
