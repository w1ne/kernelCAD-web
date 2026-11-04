// Family rest bench: Wide plaza bench with back slats, arm dividers, and a shaded stroller-clear zone underneath.
meta({
  name: "family-rest-bench",
  license: "CC0-1.0",
  title: "Family rest bench",
  description: "Wide plaza bench with back slats, arm dividers, and a shaded stroller-clear zone underneath. Controls: overall scale, timber, steel, rubber; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const timber = param("timber", "#8a6748", { label: "Sealed timber" });
const steel = param("steel", "#738087", { label: "Painted steel" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });

presets({
  festival: {
    "timber": "#ab8051",
    "steel": "#9da3a0",
    "rubber": "#3c4245"
},
  twilight: {
    "timber": "#604b3b",
    "steel": "#4f626c",
    "rubber": "#20262a"
},
});
const originOffsetMm = 0;
const p = assembly("family-rest-bench");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["arm-rest-0", "back-slat-0", "back-slat-1", "back-slat-2", "back-slat-3", "seat", "seat-slat-0", "seat-slat-1", "seat-slat-2", "seat-slat-3"].includes(name)) p.part(name, positioned.color(timber));
  else if (["arm-rest-1"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["leg-0", "leg-1"].includes(name)) p.part(name, positioned.color(steel));
  else p.part(name, positioned.color(timber));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("seat", [2200, 500, 100], [0, 0, 570]);
B("seat-slat-0", [2100, 75, 65], [0, -180, 610]);
B("seat-slat-1", [2100, 75, 65], [0, -60, 610]);
B("seat-slat-2", [2100, 75, 65], [0, 60, 610]);
B("seat-slat-3", [2100, 75, 65], [0, 180, 610]);
B("back-slat-0", [2200, 70, 105], [0, 220, 790]);
B("back-slat-1", [2200, 70, 105], [0, 220, 950]);
B("back-slat-2", [2200, 70, 105], [0, 220, 1110]);
B("back-slat-3", [2200, 70, 105], [0, 220, 1270]);
B("leg-0", [100, 560, 700], [-850, 0, 350]);
B("leg-1", [100, 560, 700], [850, 0, 350]);
B("arm-rest-0", [90, 540, 90], [-400, 0, 940]);
B("arm-rest-1", [90, 540, 90], [400, 0, 940]);

return p.model();
