// SPDX-License-Identifier: CC0-1.0
// Hive tool: a flat spring-steel bar about 250 mm long. One end is a broad
// bevelled scraper blade with a nail-puller slot; the other is either a J-hook
// that hooks under a frame lug to lever it up, or the standard short bent lip.
// The middle carries a painted band (so it can be found in the grass) or a
// rubber grip sleeve. A flat bar with a wide blade at one end and a curled hook
// at the other is what makes it a hive tool and not a paint scraper.
// Generic visualization geometry at real size, millimetres, Z up, lying on z = 0, blade towards +X.
meta({
  name: "hive-tool",
  license: 'CC0-1.0',
  title: "Hive tool",
  description: "Flat steel hive tool with a bevelled scraper blade and nail-puller slot at one end and a J-hook frame lifter or standard bent lip at the other, with a painted handle band or rubber grip sleeve. Material controls: stainless steel, handle paint, rubber grip. Style and grip choices; freshApiary and weatheredYard presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'hive tool', 'hand tool', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const style = param('style', 'j-hook', { choices: ['j-hook', 'standard'], label: 'Lifter end' });
const grip = param('grip', 'painted', { choices: ['painted', 'rubber'], label: 'Handle' });
const stainless = param('stainless', "#b9c2c0", { label: "Stainless steel" });
const paint = param('paint', "#c8372d", { label: "Handle paint" });
const rubber = param('rubber', "#333a3b", { label: "Rubber grip sleeve" });
presets({
  freshApiary: { stainless: '#dfe5e2', paint: '#e2b52b', rubber: '#485152' },
  weatheredYard: { stainless: '#7a746a', paint: '#8a3a2c', rubber: '#252b2c' },
});

const p = assembly("hive-tool");
const add = (name, shape) => p.part(name, shape.scale(scale));

const T = 5;
// A rubber sleeve lifts the bar off the ground; a painted bar lies flat.
const z0 = grip.value === 'rubber' ? 3 : 0;

// Flat bar in plan: narrow handle widening to a bevelled scraper blade at +X,
// with a nail-puller slot cut through the blade.
const bar = extrudePolygon([
  [-110, -13], [40, -15], [100, -19], [124, -19], [131, -10], [134, 0],
  [131, 10], [124, 19], [100, 19], [40, 15], [-110, 13],
], T).subtract(box(26, 5, 20, true).translate(84, 0, T / 2));
add('bar', bar.translate(0, 0, z0).color(stainless));
// Ground bevel: a thin bright strip along the blade tip.
add('blade-bevel', extrudePolygon([[124, -19], [131, -10], [134, 0], [131, 10], [124, 19], [121, 19], [121, -19]], 1.2).translate(0, 0, z0 + T).color(stainless));

// Side profile of the lifter end, extruded across the bar width.
const sideProfile = (pts, width) => extrudePolygon(pts, width).rotateX(90).translate(0, width / 2, z0);
if (style.value === 'j-hook') {
  // J-hook curls up and back over the bar to catch a frame lug.
  const cx = -110;
  const cz = 18;
  const outer = [];
  const inner = [];
  for (let i = 0; i <= 8; i += 1) {
    const a = ((-90 - i * 22.5) * Math.PI) / 180;
    outer.push([cx + 18 * Math.cos(a), cz + 18 * Math.sin(a)]);
    inner.push([cx + (18 - T) * Math.cos(a), cz + (18 - T) * Math.sin(a)]);
  }
  const hook = [...outer, [cx + 20, cz + 18], [cx + 20, cz + 18 - T], ...inner.reverse()];
  add('j-hook', sideProfile(hook, 24).color(stainless));
} else {
  // Standard tool: a short lip bent up at 90 degrees.
  add('bent-lip', sideProfile([[-116, 0], [-110, 0], [-110, T], [-111, 24], [-116, 24]], 26).color(stainless));
}

if (grip.value === 'painted') {
  add('handle-paint', box(110, 28, T + 1.5, true).translate(-52, 0, (T + 1.5) / 2).color(paint));
} else {
  // Oval rubber sleeve with finger ribs, extruded along the handle.
  const oval = [];
  for (let i = 0; i < 12; i += 1) {
    const t = (i / 12) * Math.PI * 2;
    oval.push([-5.5 * Math.sin(t), 18 * Math.cos(t)]);
  }
  add('grip-sleeve', extrudePolygon(oval, 110).rotateY(90).translate(-107, 0, z0 + T / 2).color(rubber));
  for (const x of [-90, -70, -50, -30]) {
    add(`grip-rib-${x < 0 ? -x : x}`, box(4, 38, 11, true).translate(x, 0, z0 + T / 2).color(rubber));
  }
}

return p.model();
