// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly mobile industrial tool cart scene prop, modeled from scratch.
meta({
  name: 'mobile-tool-cart',
  license: 'CC0-1.0',
  title: 'Mobile industrial tool cart',
  description: 'Mobile shop-floor tool cart with two trays, drawer cabinet, push handle and caster wheels. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'vehicle',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#6d7d84', { label: 'Body color' });
const accent = param('accent', '#e4a23c', { label: 'Accent color' });
const p = assembly('mobile-tool-cart');
p.part('drawer-cabinet', box(308.2, 265.2, 248, true).translate(0, 0, 186).translate(0, 0, 2).scale(scale).color(body));
p.part('drawer-front-0', box(262.2, 18, 52.7, true).translate(0, -142.8, 99.2).translate(0, 0, 2).scale(scale).color(accent));
p.part('drawer-pull-0', box(115, 15, 14, true).translate(0, -159.8, 99.2).translate(0, 0, 2).scale(scale).color(body));
p.part('drawer-front-1', box(262.2, 18, 52.7, true).translate(0, -142.8, 161.2).translate(0, 0, 2).scale(scale).color(accent));
p.part('drawer-pull-1', box(115, 15, 14, true).translate(0, -159.8, 161.2).translate(0, 0, 2).scale(scale).color(body));
p.part('drawer-front-2', box(262.2, 18, 52.7, true).translate(0, -142.8, 223.2).translate(0, 0, 2).scale(scale).color(accent));
p.part('drawer-pull-2', box(115, 15, 14, true).translate(0, -159.8, 223.2).translate(0, 0, 2).scale(scale).color(body));
p.part('tray-0', box(460, 340, 32, true).translate(0, 0, 347.2).translate(0, 0, 2).scale(scale).color(accent));
p.part('tray-back-0', box(423.2, 20, 44, true).translate(0, 159.8, 381.2).translate(0, 0, 2).scale(scale).color(body));
p.part('tray-1', box(460, 340, 32, true).translate(0, 0, 520.8).translate(0, 0, 2).scale(scale).color(accent));
p.part('tray-back-1', box(423.2, 20, 44, true).translate(0, 159.8, 554.8).translate(0, 0, 2).scale(scale).color(body));
p.part('handle-post--1', box(18, 18, 372, true).translate(-207, -142.8, 434).translate(0, 0, 2).scale(scale).color(body));
p.part('handle-post-1', box(18, 18, 372, true).translate(-207, 142.8, 434).translate(0, 0, 2).scale(scale).color(body));
p.part('push-handle', box(24, 312.8, 24, true).translate(-207, 0, 607.6).translate(0, 0, 2).scale(scale).color(accent));
p.part('caster--193-2--142-79999999999998', cylinder(26, 38, 8).rotate([1, 0, 0], 90).translate(-193.2, -129.8, 36).translate(0, 0, 2).scale(scale).color(accent));
p.part('caster--193-2-142-79999999999998', cylinder(26, 38, 8).rotate([1, 0, 0], 90).translate(-193.2, 155.8, 36).translate(0, 0, 2).scale(scale).color(accent));
p.part('caster-193-2--142-79999999999998', cylinder(26, 38, 8).rotate([1, 0, 0], 90).translate(193.2, -129.8, 36).translate(0, 0, 2).scale(scale).color(accent));
p.part('caster-193-2-142-79999999999998', cylinder(26, 38, 8).rotate([1, 0, 0], 90).translate(193.2, 155.8, 36).translate(0, 0, 2).scale(scale).color(accent));

return p.model();
