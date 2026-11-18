// SPDX-License-Identifier: CC0-1.0
// Portable hose reel on a wheeled frame with axle, winding drum and push handle. Material controls: coupling metal, hose fabric, rubber grip; weathered and highVisibility presets.
meta({
  name: "hose-reel-cart",
  license: 'CC0-1.0',
  title: "Fire hose reel cart",
  description: "Portable hose reel on a wheeled frame with axle, winding drum and push handle. Material controls: coupling metal, hose fabric, rubber grip; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const couplingMetalColor = param('couplingMetalColor', '#aeb9bc', { label: 'Coupling metal' });
const hoseFabricColor = param('hoseFabricColor', '#c94732', { label: 'Hose fabric' });
const rubberColor = param('rubberColor', '#30363a', { label: 'Rubber grip' });
presets({
  weathered: { couplingMetalColor: '#8c9698', hoseFabricColor: '#965443', rubberColor: '#424342' },
  highVisibility: { couplingMetalColor: '#c1c2b5', hoseFabricColor: '#e17825', rubberColor: '#30363a' },
});
const p = assembly("hose-reel-cart");
const groundOffset = 0;
const add = (name, shape, finish = hoseFabricColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("reel-flange--1", cylinder(42, 197.6, 10).rotateX(90).translate(0, -107.5, 402.8), couplingMetalColor);
add("reel-flange-1", cylinder(42, 197.6, 10).rotateX(90).translate(0, 107.5, 402.8), couplingMetalColor);
add("spool", cylinder(236.5, 114, 10).rotateX(90).translate(0, 0, 402.8), hoseFabricColor);
add("frame-leg--1", box(45, 45, 380, true).translate(0, -137.6, 190), hoseFabricColor);
add("cart-wheel--1", cylinder(60, 95, 10).rotateX(90).translate(-120.4, -142, 95), rubberColor);
add("cart-wheel--1-hub--1", cylinder(8.4, 34.2, 8).rotateX(90).translate(-120.4, -209.2, 95), rubberColor);
add("cart-wheel--1-hub-1", cylinder(8.4, 34.2, 8).rotateX(90).translate(-120.4, -134.8, 95), rubberColor);
add("frame-leg-1", box(45, 45, 380, true).translate(0, 137.6, 190), hoseFabricColor);
add("cart-wheel-1", cylinder(60, 95, 10).rotateX(90).translate(-120.4, 202, 95), rubberColor);
add("cart-wheel-1-hub--1", cylinder(8.4, 34.2, 8).rotateX(90).translate(-120.4, 134.8, 95), rubberColor);
add("cart-wheel-1-hub-1", cylinder(8.4, 34.2, 8).rotateX(90).translate(-120.4, 209.2, 95), rubberColor);
add("push-handle", box(38, 48, 456, true).translate(-189.2, 0, 577.6), couplingMetalColor);

return p.model();
