// Pirate ship ride car: Static swinging-ship-shaped ride car with stepped seating rows, a raised prow, and a central keel.
meta({
  name: "pirate-ship-ride-car",
  license: "CC0-1.0",
  title: "Pirate ship ride car",
  description: "Static swinging-ship-shaped ride car with stepped seating rows, a raised prow, and a central keel. Controls: overall scale, timber, steel, canvas; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const timber = param("timber", "#8a6748", { label: "Sealed timber" });
const steel = param("steel", "#738087", { label: "Painted steel" });
const canvas = param("canvas", "#e0c98e", { label: "Canvas" });

presets({
  festival: {
    "timber": "#ab8051",
    "steel": "#9da3a0",
    "canvas": "#eddaa9"
},
  twilight: {
    "timber": "#604b3b",
    "steel": "#4f626c",
    "canvas": "#a85e4f"
},
});
const originOffsetMm = -120;
const p = assembly("pirate-ship-ride-car");

const boatHull = (length: number, width: number, height: number) =>
  path().moveTo(-length / 2, -height / 2).lineTo(length / 2, -height / 2)
    .lineTo(length / 2, -height * 0.12).lineTo(length * 0.68, height / 2)
    .lineTo(-length * 0.68, height / 2).lineTo(-length / 2, -height * 0.12).close()
    .extrude(width).rotate([1, 0, 0], 90).translate(0, width / 2, 0);

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["hull", "prow", "seat-row-0", "seat-row-1", "seat-row-2", "stern"].includes(name)) p.part(name, positioned.color(timber));
  else if (["sail"].includes(name)) p.part(name, positioned.color(canvas));
  else if (["keel", "mast"].includes(name)) p.part(name, positioned.color(steel));
  else p.part(name, positioned.color(timber));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("keel", [2280, 360, 220], [0, 0, 230]);
place("hull", boatHull(2240, 720, 420), [0, 0, 500]);
B("prow", [620, 760, 500], [970, 0, 730], [0, -28, 0]);
B("stern", [460, 760, 390], [-970, 0, 660], [0, 18, 0]);
B("seat-row-0", [340, 620, 210], [-480, 0, 870]);
B("seat-row-1", [340, 620, 210], [0, 0, 1130]);
B("seat-row-2", [340, 620, 210], [480, 0, 1390]);
B("mast", [85, 85, 990], [0, 0, 1440]);
B("sail", [60, 620, 740], [0, 0, 1530]);

return p.model();
