// Tea cup spinner car: one cup from a "mad tea party" spinning ride. Riders sit
// on a curved bench inside and turn the centre wheel to spin the cup on its
// saucer while the whole platter rotates.
// What makes it a tea cup rather than a tub: the bulging turned cup body with a
// flared lip, the C-shaped handle on the side, a contrasting decorative band,
// the saucer turntable with a rubber bumper ring underneath, and the
// horseshoe-shaped cushioned bench around the centre spin wheel inside.
// Generic visualization geometry at real size (cup about 2.1 m across, 1.0 m
// tall on a 2.6 m saucer), millimetres, Z up, saucer on z = 0.
meta({
  name: "tea-cup-spinner-car",
  license: "CC0-1.0",
  title: "Tea cup spinner car",
  description: "Spinning tea cup ride car on its saucer turntable: bulging turned fiberglass cup with flared lip, C-shaped side handle and decorative band, horseshoe cushioned bench inside around a centre spin wheel, saucer with rubber bumper ring. Material controls: cup fiberglass, decorative enamel, polished steel, rubber, seat vinyl. Rim flared or scalloped; festival and twilight presets.",
  tags: ["tea cup ride", "teacups", "spinning cup", "spinner", "amusement park", "theme park", "family ride", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const rim = param("rim", "flared", { choices: ["flared", "scalloped"], label: "Cup rim" });
const fiberglass = param("fiberglass", "#8fcbe0", { label: "Cup body fiberglass" });
const accentEnamel = param("accentEnamel", "#f2c94c", { label: "Saucer, handle and band enamel" });
const stainlessSteel = param("stainlessSteel", "#c4cbcb", { label: "Spin wheel and column steel" });
const rubber = param("rubber", "#292f33", { label: "Bumper ring and wheel grip rubber" });
const seatVinyl = param("seatVinyl", "#c8364a", { label: "Bench cushion vinyl" });

presets({
  festival: { fiberglass: "#d7a83f", accentEnamel: "#d4554a", stainlessSteel: "#d1d1c6", rubber: "#3c4245", seatVinyl: "#2f6fb0" },
  twilight: { fiberglass: "#96566d", accentEnamel: "#e2c27a", stainlessSteel: "#788b91", rubber: "#20262a", seatVinyl: "#35576f" },
});

const p = assembly("tea-cup-spinner-car");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z, optionally only a sector.
const turned = (pts, angleDeg) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return angleDeg ? pb.close().revolve({ angleDeg }) : pb.close().revolve();
};
// Solid from an (x, z) side profile, extruded `t` thick and centred on y = 0.
const sideProfile = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const arc = (cx, cz, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => {
  const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
});

// Saucer turntable with a rubber bumper ring.
add("saucer", turned([[0, 0], [1150, 0], [1280, 90], [1280, 150], [0, 150]]).color(accentEnamel));
add("bumper-ring", turned([[1270, 0], [1330, 0], [1330, 80], [1270, 80]]).color(rubber));

// Cup: one turned wall section with the floor, a bulge and a flared lip.
add("cup-body", turned([
  [0, 150], [460, 150], [500, 240], [720, 310], [890, 430], [985, 620], [1010, 820], [1070, 960], [1050, 995],
  [950, 900], [925, 640], [830, 470], [660, 390], [0, 390],
]).color(fiberglass));
add("decor-band", turned([[990, 660], [1012, 660], [1022, 760], [1000, 760]]).color(accentEnamel));
add("foot-ring", turned([[440, 150], [560, 150], [560, 200], [490, 240]]).color(accentEnamel));
// C-shaped handle on the side.
const HANDLE = [...arc(960, 640, 270, -80, 80, 8), ...arc(960, 640, 175, 80, -80, 8)];
add("cup-handle", sideProfile(HANDLE, 90).rotateZ(-50).color(accentEnamel));

if (rim.value === "scalloped") {
  for (let i = 0; i < 12; i += 1) {
    const petal = sideProfile([[-170, 0], [170, 0], [120, 80], [0, 120], [-120, 80]], 40)
      .rotateX(-18)
      .translate(0, 1035, 975)
      .rotateZ((i * 360) / 12 + 15);
    add(`rim-petal-${i}`, petal.color(accentEnamel));
  }
}

// Horseshoe bench inside: seat and back cushion, open towards the entry side (+X).
add("bench-seat", turned([[560, 395], [820, 395], [880, 560], [560, 560]], 290).rotateZ(35).color(seatVinyl));
add("bench-back", turned([[850, 560], [925, 560], [925, 860], [850, 860]], 290).rotateZ(35).color(seatVinyl));

// Centre spin wheel on its column.
add("wheel-column", turned([[0, 380], [150, 380], [60, 470], [60, 760], [0, 760]]).color(stainlessSteel));
add("spin-wheel", turned([[0, 760], [300, 760], [300, 790], [0, 810]]).color(stainlessSteel));
add("wheel-grip", turned([[285, 750], [330, 750], [330, 800], [285, 800]]).color(rubber));
add("wheel-hub-cap", turned([[0, 820], [110, 820], [70, 870], [0, 880]]).color(accentEnamel));

return p.model();
