// SPDX-License-Identifier: CC0-1.0
// Admission turnstile bank: the row of waist-high tripod turnstiles guests
// pass through at the park gate.
// What makes it a tripod turnstile bank rather than a row of bollards: each
// lane is bounded by a long stainless cabinet with a sloped reading face,
// and the three-arm rotor sticks out of the cabinet flank on a hub tilted
// down into the lane, so one arm always sits level across the walkway while
// the other two hang back toward the cabinet. Ticket and wristband readers
// with red/green signal lamps sit on the entry end of each cabinet, and a
// tubular guide rail runs out in front of every lane to straighten the queue.
// Generic visualization geometry at about real size (four cabinets, three
// lanes, about 2.9 m wide and 2 m deep), millimetres, Z up, guests approach
// from -Y, standing on z = 0.
meta({
  name: "admission-turnstile-bank",
  license: "CC0-1.0",
  title: "Admission turnstile bank",
  description: "Three-lane tripod turnstile bank at about real size: four long stainless cabinets with sloped reading faces and moulded top covers, a three-arm rotor on a tilted hub in each lane with one arm level across the walkway, ticket and wristband readers with red/green signal lamps, tubular queue guide rails and anchored floor plates. Material controls: stainless cabinet and arms, anodized aluminium rails, moulded polymer covers and readers, signal lamps. Festival, twilight and night-opening presets.",
  tags: ["turnstile", "tripod turnstile", "admission gate", "entry gate", "access control", "amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 6000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless cabinet and rotor arms" });
const anodizedAluminum = param("anodizedAluminum", "#859b9e", { label: "Anodized aluminium guide rails" });
const polymer = param("polymer", "#2f5f73", { label: "Moulded polymer covers and readers" });
const signal = param("signal", "#3fd06a", { label: "Signal lamp" });

presets({
  festival: { stainlessSteel: "#d1d1c6", anodizedAluminum: "#b7c4c3", polymer: "#d46a3a" },
  twilight: { stainlessSteel: "#788b91", anodizedAluminum: "#576f78", polymer: "#455e83" },
  nightOpening: { stainlessSteel: "#5d676b", anodizedAluminum: "#3b474d", polymer: "#1d2430", signal: "#ff4f5a" },
});

const p = assembly("admission-turnstile-bank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Profile drawn in (y, z) and pushed along X by t, centred on x = 0.
const longSide = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
const rod = (len: number, r: number, n = 10) => cylinder(len, r, n);

const CAB_X = [-1200, -400, 400, 1200];
const CAB_W = 240;
const CAB_L = 1000;
// Cabinet side profile: low sloped reading face at the entry (-Y) end,
// level top over the rotor, rounded exit end.
const cabinetProfile = filletPolygon([
  [-CAB_L / 2, 60], [-CAB_L / 2, 880], [-CAB_L / 2 + 240, 1000], [CAB_L / 2, 1000], [CAB_L / 2, 60],
], 40, { segments: 4 });
const coverProfile = filletPolygon([
  [-CAB_L / 2 - 10, 870], [-CAB_L / 2 + 235, 992], [CAB_L / 2 + 10, 992], [CAB_L / 2 + 10, 1030], [-CAB_L / 2 + 225, 1030], [-CAB_L / 2 - 10, 912],
], 12, { segments: 3 });

CAB_X.forEach((x, i) => {
  add(`cabinet-${i}`, longSide(cabinetProfile, CAB_W).translate(x, 0, 0).color(stainlessSteel));
  add(`top-cover-${i}`, longSide(coverProfile, CAB_W + 20).translate(x, 0, 0).color(polymer));
  add(`plinth-${i}`, box(CAB_W + 40, CAB_L + 40, 60, true).translate(x, 0, 30).color(polymer));
  add(`floor-plate-${i}`, box(CAB_W + 160, CAB_L + 200, 12, true).translate(x, 0, 6).color(anodizedAluminum));
  for (const sx of [-1, 1]) {
    add(`access-door-${i}-${sx > 0 ? "r" : "l"}`, box(6, 560, 560, true).translate(x + sx * (CAB_W / 2 + 3), 120, 480).color(anodizedAluminum));
    add(`door-lock-${i}-${sx > 0 ? "r" : "l"}`, rod(10, 16, 8).rotateY(90 * sx).translate(x + sx * (CAB_W / 2 + 6), 320, 620).color(polymer));
  }
  // Reader on the sloped face with its signal lamp above.
  add(`reader-${i}`, box(170, 40, 150, true).rotateX(-27).translate(x, -CAB_L / 2 + 110, 960).color(polymer));
  add(`reader-glass-${i}`, box(120, 10, 90, true).rotateX(-27).translate(x, -CAB_L / 2 + 92, 970).color(anodizedAluminum));
  add(`signal-lamp-${i}`, sphere(26).scale([1, 1, 0.6]).translate(x, -CAB_L / 2 + 330, 1036).color(signal));

  // Tubular guide rail running out in front of the cabinet.
  const railY0 = -CAB_L / 2 - 20;
  const railY1 = railY0 - 900;
  add(`guide-post-${i}`, rod(950, 30).translate(x, railY1, 0).color(anodizedAluminum));
  add(`guide-post-foot-${i}`, cylinder(14, 70, 12).translate(x, railY1, 0).color(stainlessSteel));
  add(`guide-rail-top-${i}`, rod(900, 26).rotateX(90).translate(x, railY0, 950).color(anodizedAluminum));
  add(`guide-rail-mid-${i}`, rod(900, 18).rotateX(90).translate(x, railY0, 520).color(anodizedAluminum));
  add(`guide-cap-${i}`, sphere(32).translate(x, railY1, 950).color(polymer));
});

// Three-arm rotor on each lane's +X cabinet flank. The hub axis points down
// into the lane at 45 deg and the arms sweep a 45 deg cone round it, so the
// arm at azimuth 180 lies level across the walkway.
const ARM_LEN = 470;
for (let lane = 0; lane < 3; lane++) {
  const hx = CAB_X[lane] + CAB_W / 2;
  const hy = 60;
  const hz = 860;
  const orient = (s: Shape) => s.rotateY(135).translate(hx, hy, hz);
  add(`hub-boss-${lane}`, orient(cylinder(70, 75, 16).translate(0, 0, -20)).color(stainlessSteel));
  add(`hub-cap-${lane}`, orient(sphere(62).scale([1, 1, 0.55]).translate(0, 0, 50)).color(polymer));
  [180, 300, 60].forEach((az, k) => {
    const arm = rod(ARM_LEN, 19, 10).translate(0, 0, 30).rotateY(45).rotateZ(az);
    add(`rotor-arm-${lane}-${k}`, orient(arm).color(stainlessSteel));
    const tip = sphere(22).translate(0, 0, ARM_LEN + 30).rotateY(45).rotateZ(az);
    add(`rotor-arm-tip-${lane}-${k}`, orient(tip).color(polymer));
  });
}

return p.model();
