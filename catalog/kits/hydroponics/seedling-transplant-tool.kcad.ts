// SPDX-License-Identifier: CC0-1.0
// Seedling transplant tool: the hand dibber a grower uses to open a hole
// in a slab, cube or pot and ease a plug seedling into it.
// What makes it a dibber: a turned hardwood handle with a palm bulge and
// a leather hanging loop, a brass ferrule, and a tapered stainless spike
// with red depth rings (or, as the widger variant, a narrow spoon blade
// for lifting seedlings out of a plug tray). It lies on the bench, tip
// and handle both touching, at real hand-tool size.
// Generic visualization geometry at about real size (about 290 mm long),
// millimetres, Z up, tool axis along X.

meta({
  name: "seedling-transplant-tool",
  license: 'CC0-1.0',
  title: "Seedling transplant tool",
  description: "Hand dibber for transplanting seedlings at about real size: turned hardwood handle with palm bulge and leather hanging loop, brass ferrule and a tapered stainless spike with depth rings, or a narrow widger spoon blade. Material controls: handle wood, stainless steel, ferrule brass and depth markings, plus tip (dibber or widger). beech, walnut, weathered and highVisibility presets.",
  tags: ['dibber', 'widger', 'transplant tool', 'hand tool', 'seedling', 'propagation', 'greenhouse', 'hydroponics', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const wood = param('handleWood', '#c99a62', { label: 'Handle (turned hardwood)' });
const steel = param('stainlessSteel', '#c4cacd', { label: 'Spike or blade (stainless steel)' });
const ferrule = param('ferruleBrass', '#c49a3c', { label: 'Ferrule (brass)' });
const marks = param('depthMarks', '#c8332b', { label: 'Depth rings and hanging loop' });
const tip = param('tip', 'dibber', { choices: ['dibber', 'widger'], label: 'Tip' });

presets({
  beech: { handleWood: '#c99a62', stainlessSteel: '#c4cacd', ferruleBrass: '#c49a3c', depthMarks: '#c8332b' },
  walnut: { handleWood: '#6b4528', stainlessSteel: '#d0d5d8', ferruleBrass: '#b8862f', depthMarks: '#2c2a28' },
  weathered: { handleWood: '#9a8264', stainlessSteel: '#9fa3a0', ferruleBrass: '#8f7440', depthMarks: '#8c4a3c' },
  highVisibility: { handleWood: '#f2c84b', stainlessSteel: '#dfe3e5', ferruleBrass: '#e87832', depthMarks: '#e83a2e' },
});

const p = assembly("seedling-transplant-tool");
// Built along +Z (tip at z=0), then laid down along +X and tilted so the
// tip and the handle bulge both rest on the bench.
const lay = (s: Shape) => s.rotateY(85).translate(0, 0, 2.501).scale(scale);
const add = (name: string, shape: Shape) => p.part(name, lay(shape));
const turned = (pts: [number, number][], seg = 14) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};
const S0 = 140; // where the steel meets the ferrule

if (tip.value === 'dibber') {
  // Tapered spike; depth rings every 20 mm from 30 mm.
  add("spike", turned([[0, 0], [3, 8], [9, 100], [10, S0 + 6], [0, S0 + 6]]).color(steel));
  for (const z of [30, 50, 70]) {
    const r = 3 + (6 * (z - 8)) / 92;
    add(`depth-ring-${z}`, cylinder(3, r + 0.7, 14).translate(0, 0, z).color(marks));
  }
} else {
  // Widger: narrow spoon blade on a round shank.
  const blade: [number, number][] = [[-4, 0], [4, 0], [10, 12], [11, 70], [7, 84], [-7, 84], [-11, 70], [-10, 12]];
  add("blade", extrudePolygon(blade, 2.5).rotateX(90).translate(0, 1.25, 0).rotateZ(90).color(steel));
  add("blade-dish", box(2, 14, 50, true).translate(-1.6, 0, 40).color('#9ea4a7'));
  add("shank", turned([[0, 80], [5, 80], [7, S0 + 6], [0, S0 + 6]]).color(steel));
}

// Brass ferrule, turned handle with palm bulge, end loop hole and leather loop.
add("ferrule", turned([[12, S0], [13.5, S0], [13.5, S0 + 24], [12, S0 + 24]]).color(ferrule));
add("handle", turned([[0, S0 + 2], [12.5, S0 + 2], [13, S0 + 26], [16, S0 + 40], [19, S0 + 80], [18, S0 + 110], [13, S0 + 128], [8, S0 + 134], [0, S0 + 135]]).color(wood));
add("grip-groove", cylinder(4, 17.4, 14).translate(0, 0, S0 + 52).color('#8a6438'));
add("hanging-loop", torus(16, 2.2, 10).rotateY(90).translate(0, 0, S0 + 146).color(marks));

return p.model();
