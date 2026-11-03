// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "bay-washdown-hose-reel",
  license: 'CC0-1.0',
  title: "Bay washdown hose reel",
  description: "Wall reel with a circular hose drum, swivel mount, spray hose and pistol grip." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "bay", "washdown", "hose", "reel"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#668b88", { label: 'Asset color' });
const p = assembly("bay-washdown-hose-reel");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const c = (name: string, h: number, r: number, segments: number, at: [number, number, number], axis?: [number, number, number], degrees = 0) => {
  let shape = cylinder(h, r, segments);
  if (axis && degrees) shape = shape.rotate(axis, degrees);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("mount-plate", [300, 75, 380], [0, 0, 1350]);
c("drum", 110, 220, 12, [0, -55, 1350], [1, 0, 0], 90);
c("hub", 90, 60, 10, [0, -105, 1350], [1, 0, 0], 90);
c("hose", 720, 22, 10, [0, -90, 630]);
b("spray-grip", [70, 60, 260], [0, -110, 590]);
c("trigger", 80, 16, 8, [0, -150, 510]);

return p.model();
