// Park wayfinding pylon: Tall freestanding direction marker with three offset destination blades and a broad ground plinth.
meta({
  name: "wayfinding-pylon",
  license: "CC0-1.0",
  title: "Park wayfinding pylon",
  description: "Tall freestanding direction marker with three offset destination blades and a broad ground plinth. Controls: overall scale, powderCoat, anodizedAluminum, enamel; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated steel" });
const anodizedAluminum = param("anodizedAluminum", "#859b9e", { label: "Anodized aluminum" });
const enamel = param("enamel", "#cc684e", { label: "Baked enamel" });

presets({
  festival: {
    "powderCoat": "#d47452",
    "anodizedAluminum": "#b7c4c3",
    "enamel": "#edb34d"
},
  twilight: {
    "powderCoat": "#35576f",
    "anodizedAluminum": "#576f78",
    "enamel": "#385b81"
},
});
const originOffsetMm = 0;
const p = assembly("wayfinding-pylon");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["east-blade", "north-blade", "west-blade"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["emblem"].includes(name)) p.part(name, positioned.color(enamel));
  else if (["mast", "plinth"].includes(name)) p.part(name, positioned.color(anodizedAluminum));
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

B("plinth", [740, 680, 180], [0, 0, 90]);
B("mast", [190, 190, 3000], [0, 0, 1680]);
B("north-blade", [1500, 150, 340], [150, 0, 2700], [0, 0, -7]);
B("east-blade", [1270, 150, 330], [-90, 0, 2110], [0, 0, 6]);
B("west-blade", [1400, 150, 330], [130, 0, 1510], [0, 0, -5]);
C("emblem", 95, 150, [0, -120, 3210], [90, 0, 0], 12);

return p.model();
