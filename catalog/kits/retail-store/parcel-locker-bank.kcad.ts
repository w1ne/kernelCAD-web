// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "parcel-locker-bank",
  license: 'CC0-1.0',
  title: "Parcel locker bank",
  description: "Self-service parcel locker bank with mixed-size door bays, keypad column and top sign panel. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6e7d84", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("parcel-locker-bank");
p.part("back", b(0, 60, 1250, 1600, 110, 2500).color(color));
p.part("locker-0-0", b(-520, 0, 250, 500, 90, 470).color(color));
p.part("locker-0-1", b(-520, 0, 750, 500, 90, 470).color(color));
p.part("locker-0-2", b(-520, 0, 1250, 500, 90, 470).color(color));
p.part("locker-0-3", b(-520, 0, 1750, 500, 90, 470).color(color));
p.part("locker-1-0", b(0, 0, 250, 500, 90, 470).color(color));
p.part("locker-1-1", b(0, 0, 750, 500, 90, 470).color(color));
p.part("locker-1-2", b(0, 0, 1250, 500, 90, 470).color(color));
p.part("locker-1-3", b(0, 0, 1750, 500, 90, 470).color(color));
p.part("locker-2-0", b(520, 0, 250, 500, 90, 470).color(color));
p.part("locker-2-1", b(520, 0, 750, 500, 90, 470).color(color));
p.part("locker-2-2", b(520, 0, 1250, 500, 90, 470).color(color));
p.part("locker-2-3", b(520, 0, 1750, 500, 90, 470).color(color));
p.part("keypad-panel", b(720, -100, 1120, 180, 100, 1100).color(color));
p.part("header", b(0, -5, 2570, 1600, 220, 140).color(color));
p.part("lock-0-0", c(-650, -58, 260, 16, 16, 8).color(color));
p.part("lock-0-1", c(-650, -58, 760, 16, 16, 8).color(color));
p.part("lock-0-2", c(-650, -58, 1260, 16, 16, 8).color(color));
p.part("lock-0-3", c(-650, -58, 1760, 16, 16, 8).color(color));
p.part("lock-1-0", c(-130, -58, 260, 16, 16, 8).color(color));
p.part("lock-1-1", c(-130, -58, 760, 16, 16, 8).color(color));
p.part("lock-1-2", c(-130, -58, 1260, 16, 16, 8).color(color));
p.part("lock-1-3", c(-130, -58, 1760, 16, 16, 8).color(color));
p.part("lock-2-0", c(390, -58, 260, 16, 16, 8).color(color));
p.part("lock-2-1", c(390, -58, 760, 16, 16, 8).color(color));
p.part("lock-2-2", c(390, -58, 1260, 16, 16, 8).color(color));
p.part("lock-2-3", c(390, -58, 1760, 16, 16, 8).color(color));

return p.model();
