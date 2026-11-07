// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly fire hose reel cart scene prop, modeled from scratch.
meta({
  name: "hose-reel-cart",
  license: 'CC0-1.0',
  title: "Fire hose reel cart",
  description: "Portable hose reel on a wheeled frame with axle, winding drum and push handle. Knobs: overall scale, body color and accent color.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d74735', { label: 'Accent color' });
const p = assembly("hose-reel-cart");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("reel-flange--1", cylinder(42, 197.6, 10).rotate([1, 0, 0], 90).translate(0, -107.5, 402.8), accent);
add("reel-flange-1", cylinder(42, 197.6, 10).rotate([1, 0, 0], 90).translate(0, 107.5, 402.8), accent);
add("spool", cylinder(236.5, 114, 10).rotate([1, 0, 0], 90).translate(0, 0, 402.8), body);
add("frame-leg--1", box(45, 45, 380, true).translate(0, -137.6, 190), body);
add("cart-wheel--1", cylinder(60, 95, 10).rotate([1, 0, 0], 90).translate(-120.4, -142, 95), "#30363b");
add("cart-wheel--1-hub--1", cylinder(8.4, 34.2, 8).rotate([1, 0, 0], 90).translate(-120.4, -209.2, 95), accent);
add("cart-wheel--1-hub-1", cylinder(8.4, 34.2, 8).rotate([1, 0, 0], 90).translate(-120.4, -134.8, 95), accent);
add("frame-leg-1", box(45, 45, 380, true).translate(0, 137.6, 190), body);
add("cart-wheel-1", cylinder(60, 95, 10).rotate([1, 0, 0], 90).translate(-120.4, 202, 95), "#30363b");
add("cart-wheel-1-hub--1", cylinder(8.4, 34.2, 8).rotate([1, 0, 0], 90).translate(-120.4, 134.8, 95), accent);
add("cart-wheel-1-hub-1", cylinder(8.4, 34.2, 8).rotate([1, 0, 0], 90).translate(-120.4, 209.2, 95), accent);
add("push-handle", box(38, 48, 456, true).translate(-189.2, 0, 577.6), accent);

return p.model();
