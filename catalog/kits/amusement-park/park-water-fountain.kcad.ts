// SPDX-License-Identifier: CC0-1.0
// Park drinking fountain: the freestanding pedestal fountain with a bottle
// filler that stands by the rest areas and queue exits.
// What makes it a drinking fountain rather than a post with a dish: a turned
// pedestal column with a flared foot, a shallow stainless bowl with a drain
// and a chrome bubbler head, a push button on a housing at the guest's side,
// a bottle-filler tower behind it with a recessed alcove, spout, drip grate
// and sensor, a low pet bowl with its own spigot, all on a concrete pad.
// Generic visualization geometry at about real size (about 0.9 m square pad,
// 1.65 m to the top of the filler tower), millimetres, Z up, guest face on
// -Y, standing on z = 0.
meta({
  name: "park-water-fountain",
  license: "CC0-1.0",
  title: "Park drinking fountain",
  description: "Freestanding park drinking fountain at about real size: turned pedestal column with a flared foot, shallow stainless bowl with drain and chrome bubbler head, push-button housing, bottle-filler tower with recessed alcove, spout, drip grate and sensor, a pet bowl with its own spigot, on a concrete pad. Material controls: powder-coated pedestal and tower, stainless steel, button and badge accent, concrete. Festival, twilight and heritage presets.",
  tags: ["drinking fountain", "water fountain", "bottle filler", "bubbler", "pet bowl", "amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 3500,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#2f6f8f", { label: "Powder-coated pedestal and filler tower" });
const stainlessSteel = param("stainlessSteel", "#c3cbca", { label: "Stainless bowl, bubbler and spouts" });
const accent = param("accent", "#e3a72f", { label: "Push buttons, badge and sensor" });
const concrete = param("concrete", "#a09d94", { label: "Concrete pad" });

presets({
  festival: { powderCoat: "#d0573c", stainlessSteel: "#d6dad6", accent: "#f2c230", concrete: "#b3afa5" },
  twilight: { powderCoat: "#2b3f55", stainlessSteel: "#8a9aa0", accent: "#4fb3c9", concrete: "#6f7477" },
  heritage: { powderCoat: "#2f4a35", stainlessSteel: "#b89a5c", accent: "#c9b27a", concrete: "#9c958a" },
});

const p = assembly("park-water-fountain");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const turned = (pts: [number, number][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const PAD = 80;

// Concrete pad with rounded corners.
add("pad", extrudePolygon(filletPolygon([[-450, -460], [450, -460], [450, 440], [-450, 440]], 90, { segments: 4 }), PAD).color(concrete));

// Turned pedestal column: flared foot, waisted shaft, flared head.
add("pedestal", turned([[0, PAD], [230, PAD], [230, PAD + 40], [150, PAD + 140], [125, PAD + 300], [125, 700], [175, 790], [175, 830], [0, 830]]).color(powderCoat));
add("pedestal-band", turned([[0, 300], [134, 300], [134, 340], [0, 340]]).color(stainlessSteel));

// Shallow stainless bowl with a rolled rim, drain and bubbler head.
add("bowl", turned([[0, 830], [170, 830], [390, 915], [405, 965], [380, 965], [165, 870], [0, 870]]).color(stainlessSteel));
add("drain", cylinder(6, 40, 12).translate(0, 0, 870).color(powderCoat));
add("bubbler-post", cylinder(110, 22, 12).translate(-110, -110, 870).color(stainlessSteel));
add("bubbler-head", turned([[0, 0], [38, 0], [42, 30], [26, 58], [0, 64]]).translate(-110, -110, 975).color(stainlessSteel));

// Push-button housing on the guest side of the bowl.
add("button-housing", extrudeRoundedRect(200, 120, 30, 70, { axis: "y" }).translate(0, -460, 900).color(powderCoat));
add("button-housing-arm", box(120, 120, 60, true).translate(0, -380, 870).color(powderCoat));
add("push-button", cylinder(24, 42, 16).rotateX(90).translate(0, -460, 900).color(accent));

// Bottle-filler tower behind the bowl with a recessed alcove.
const TY = 300;
const TD = 160;
const TOP = 1650;
const tower = extrudeRoundedRect(440, TOP - PAD, 70, TD, { axis: "y" }).translate(0, TY, (TOP + PAD) / 2)
  .subtract(box(300, 160, 400, true).translate(0, TY, 1250));
add("filler-tower", tower.color(powderCoat));
add("tower-cap", extrudeRoundedRect(480, 40, 20, TD + 40, { axis: "y" }).translate(0, TY - 20, TOP + 20).color(stainlessSteel));
add("alcove-lining", box(300, 10, 400, true).translate(0, TY + 75, 1250).color(stainlessSteel));
add("filler-spout", cylinder(70, 22, 12).translate(0, TY + 40, 1380).color(stainlessSteel));
add("filler-nozzle", turned([[0, 0], [30, 0], [22, 18], [0, 18]]).translate(0, TY + 40, 1362).color(stainlessSteel));
add("sensor-lens", cylinder(12, 20, 12).rotateX(90).translate(110, TY + 70, 1400).color(accent));
add("drip-grate", box(300, 80, 20, true).translate(0, TY + 40, 1060).color(stainlessSteel));
for (let k = 0; k < 5; k++) add(`grate-slot-${k}`, box(16, 70, 6, true).translate(-100 + k * 50, TY + 38, 1072).color(powderCoat));
add("badge", cylinder(10, 80, 20).rotateX(90).translate(0, TY, 1550).color(accent));
const dropPts: [number, number][] = [];
for (let k = 0; k <= 10; k++) {
  const a = Math.PI / 2 + Math.acos(1 / 2) + (k / 10) * (2 * Math.PI - 2 * Math.acos(1 / 2));
  dropPts.push([30 * Math.cos(a), 30 * Math.sin(a)]);
}
dropPts.push([0, 60]);
add("badge-drop", extrudePolygon(dropPts, 12).rotateX(90).translate(0, TY - 10, 1530).color(stainlessSteel));

// Pet bowl at the foot with its own spigot.
add("pet-bowl", turned([[0, PAD], [110, PAD], [170, PAD + 70], [150, PAD + 70], [95, PAD + 22], [0, PAD + 22]]).translate(-260, -250, 0).color(stainlessSteel));
add("pet-spigot-riser", cylinder(260, 18, 10).translate(-260, -30, PAD).color(stainlessSteel));
add("pet-spigot", cylinder(150, 16, 10).rotateX(90).translate(-260, -30, PAD + 250).color(stainlessSteel));

return p.model();
