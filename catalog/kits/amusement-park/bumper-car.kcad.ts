// Bumper car: Single electric bumper car with four perimeter bumper rails, a low cockpit, overhead pickup mast, steering control, and four floor rollers.
meta({
  name: "bumper-car",
  license: "CC0-1.0",
  title: "Bumper car",
  description: "Single electric bumper car with four perimeter bumper rails, a low cockpit, overhead pickup mast, steering control, and four floor rollers. Controls: overall scale, fiberglass, stainlessSteel, rubber, enamel; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const fiberglass = param("fiberglass", "#4d8290", { label: "Painted fiberglass" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });
const enamel = param("enamel", "#cc684e", { label: "Baked enamel" });

presets({
  festival: {
    "fiberglass": "#d7a83f",
    "stainlessSteel": "#d1d1c6",
    "rubber": "#3c4245",
    "enamel": "#edb34d"
},
  twilight: {
    "fiberglass": "#96566d",
    "stainlessSteel": "#788b91",
    "rubber": "#20262a",
    "enamel": "#385b81"
},
});
const originOffsetMm = 0;
const p = assembly("bumper-car");

const noseProfile = path().moveTo(-190, -150).lineTo(190, -150).lineTo(145, 120).lineTo(-135, 150).close();
const taperedNose = noseProfile.extrude(640).rotate([1, 0, 0], 90).rotate([0, 1, 0], -15).translate(0, 320, 0);
const carDeck = path().moveTo(-620, -420).lineTo(430, -420).lineTo(620, -270)
  .lineTo(620, 270).lineTo(430, 420).lineTo(-500, 420).lineTo(-620, 280).close().extrude(180);

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["nose"].includes(name)) p.part(name, positioned.color(fiberglass));
  else if (["seat", "seat-back", "seat-bolster-left", "seat-bolster-right", "seat-pan"].includes(name)) p.part(name, positioned.color(enamel));
  else if (["bumper-front", "bumper-left", "bumper-rear", "bumper-right", "roller-0", "roller-1", "roller-2", "roller-3", "steering-wheel"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["floor-pan", "power-pickup", "steering-column"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else p.part(name, positioned.color(fiberglass));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};
const C = (name: string, height: number, radius: number, at: [number, number, number], rotation: [number, number, number] = [0, 0, 0], segments = 10) => {
  let shape = cylinder(height, radius, segments);
  if (rotation[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

place("floor-pan", carDeck, [0, 0, 190]);
B("bumper-front", [1320, 95, 95], [0, -520, 250]);
B("bumper-rear", [1320, 95, 95], [0, 520, 250]);
B("bumper-left", [95, 1050, 95], [-650, 0, 250]);
B("bumper-right", [95, 1050, 95], [650, 0, 250]);
place("nose", taperedNose, [510, 0, 440]);
B("seat-pan", [420, 400, 85], [-120, 0, 385]);
B("seat-back", [420, 90, 330], [-120, 170, 550], [-12, 0, 0]);
B("seat-bolster-left", [70, 360, 210], [-295, 15, 470]);
B("seat-bolster-right", [70, 360, 210], [55, 15, 470]);
C("steering-column", 250, 24, [180, -20, 560], [0, -20, 0], 8);
C("steering-wheel", 42, 140, [180, -20, 790], [90, 0, 0], 10);
C("roller-0", 80, 110, [-410, -400, 110], [0, 90, 0], 8);
C("roller-1", 80, 110, [410, -400, 110], [0, 90, 0], 8);
C("roller-2", 80, 110, [-410, 400, 110], [0, 90, 0], 8);
C("roller-3", 80, 110, [410, 400, 110], [0, 90, 0], 8);
C("power-pickup", 650, 24, [-400, 0, 650], [0, 0, 0], 8);

return p.model();
