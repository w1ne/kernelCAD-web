// Family carousel: Round family ride platform with a central mast, radial canopy braces, and eight outward-facing seats.
meta({
  name: "family-carousel",
  license: "CC0-1.0",
  title: "Family carousel",
  description: "Round family ride platform with a central mast, radial canopy braces, and eight outward-facing seats. Controls: overall scale, powderCoat, stainlessSteel, fiberglass; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated steel" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const fiberglass = param("fiberglass", "#4d8290", { label: "Painted fiberglass" });

presets({
  festival: {
    "powderCoat": "#d47452",
    "stainlessSteel": "#d1d1c6",
    "fiberglass": "#d7a83f"
},
  twilight: {
    "powderCoat": "#35576f",
    "stainlessSteel": "#788b91",
    "fiberglass": "#96566d"
},
});
const originOffsetMm = 0;
const p = assembly("family-carousel");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["canopy", "canopy-crown", "platform", "seat-0", "seat-1", "seat-2", "seat-3", "seat-4", "seat-5", "seat-6"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["seat-7"].includes(name)) p.part(name, positioned.color(fiberglass));
  else if (["canopy-support-0", "canopy-support-1", "canopy-support-2", "canopy-support-3", "canopy-support-4", "canopy-support-5", "canopy-support-6", "canopy-support-7", "center-mast", "seat-pole-0", "seat-pole-1", "seat-pole-2", "seat-pole-3", "seat-pole-4", "seat-pole-5", "seat-pole-6", "seat-pole-7"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else p.part(name, positioned.color(powderCoat));
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

C("platform", 180, 1450, [0, 0, 0], [0, 0, 0], 16);
C("center-mast", 2560, 115, [0, 0, 180], [0, 0, 0], 12);
C("canopy", 170, 1280, [0, 0, 2560], [0, 0, 0], 16);
C("canopy-crown", 130, 380, [0, 0, 2730], [0, 0, 0], 12);
C("canopy-support-0", 950, 34, [1040.0, 0.0, 1610], [0, 0, 0], 8);
C("canopy-support-1", 950, 34, [735.3910524340095, 735.3910524340093, 1610], [0, 0, 0], 8);
C("canopy-support-2", 950, 34, [6.368163355566237e-14, 1040.0, 1610], [0, 0, 0], 8);
C("canopy-support-3", 950, 34, [-735.3910524340093, 735.3910524340095, 1610], [0, 0, 0], 8);
C("canopy-support-4", 950, 34, [-1040.0, 1.2736326711132473e-13, 1610], [0, 0, 0], 8);
C("canopy-support-5", 950, 34, [-735.3910524340096, -735.3910524340093, 1610], [0, 0, 0], 8);
C("canopy-support-6", 950, 34, [-1.9104490066698708e-13, -1040.0, 1610], [0, 0, 0], 8);
C("canopy-support-7", 950, 34, [735.3910524340092, -735.3910524340096, 1610], [0, 0, 0], 8);
C("seat-pole-0", 1440, 26, [980.0, 0.0, 1120], [0, 0, 0], 8);
C("seat-pole-1", 1440, 26, [692.9646455628166, 692.9646455628165, 1120], [0, 0, 0], 8);
C("seat-pole-2", 1440, 26, [6.000769315822031e-14, 980.0, 1120], [0, 0, 0], 8);
C("seat-pole-3", 1440, 26, [-692.9646455628165, 692.9646455628166, 1120], [0, 0, 0], 8);
C("seat-pole-4", 1440, 26, [-980.0, 1.2001538631644062e-13, 1120], [0, 0, 0], 8);
C("seat-pole-5", 1440, 26, [-692.9646455628167, -692.9646455628165, 1120], [0, 0, 0], 8);
C("seat-pole-6", 1440, 26, [-1.8002307947466092e-13, -980.0, 1120], [0, 0, 0], 8);
C("seat-pole-7", 1440, 26, [692.9646455628164, -692.9646455628167, 1120], [0, 0, 0], 8);
B("seat-0", [370, 300, 250], [980.0, 0.0, 980], [0, 0, 0]);
B("seat-1", [370, 300, 250], [692.9646455628166, 692.9646455628165, 980], [0, 0, 45]);
B("seat-2", [370, 300, 250], [6.000769315822031e-14, 980.0, 980], [0, 0, 90]);
B("seat-3", [370, 300, 250], [-692.9646455628165, 692.9646455628166, 980], [0, 0, 135]);
B("seat-4", [370, 300, 250], [-980.0, 1.2001538631644062e-13, 980], [0, 0, 180]);
B("seat-5", [370, 300, 250], [-692.9646455628167, -692.9646455628165, 980], [0, 0, 225]);
B("seat-6", [370, 300, 250], [-1.8002307947466092e-13, -980.0, 980], [0, 0, 270]);
B("seat-7", [370, 300, 250], [692.9646455628164, -692.9646455628167, 980], [0, 0, 315]);

return p.model();
