// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "station-callout-light-strip",
  license: 'CC0-1.0',
  title: "Station callout light strip",
  description: "Hallway callout light bar with three labeled response-zone indicators." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "callout", "light", "strip"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#77867e", { label: 'Asset color' });
const p = assembly("station-callout-light-strip");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("backplate", [1450, 60, 160], [0, 0, 1900]);
b("lens-0", [350, 28, 80], [-480, -42, 1900]);
b("lens-1", [350, 28, 80], [0, -42, 1900]);
b("lens-2", [350, 28, 80], [480, -42, 1900]);
b("label-0", [300, 18, 52], [-480, -44, 1780]);
b("label-1", [300, 18, 52], [0, -44, 1780]);
b("label-2", [300, 18, 52], [480, -44, 1780]);
b("mount-left", [70, 90, 120], [-620, 0, 1790]);
b("mount-right", [70, 90, 120], [620, 0, 1790]);

return p.model();
