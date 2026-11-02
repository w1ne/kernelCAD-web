// Original kernelCAD small sailboat with editable sloop and catboat rigs.

meta({
  name: 'sailboat', license: 'CC0-1.0', title: 'Small sailboat',
  description: 'Compact sailboat with a pointed bow, weighted keel, mast and either a sloop or catboat rig. Knobs: rig, hull, sail and trim colours.',
  tags: ['sailboat', 'sailing', 'dinghy', 'watercraft', 'lake', 'coastal'], kit: 'watercraft', category: 'vehicle', origin: 'base',
  compat: ['water', 'lake', 'coastal', 'harbor'], triangleBudget: 440,
});

const rig = param('rig', 'sloop', { choices: ['sloop', 'catboat'], label: 'Sail rig' });
const hullColor = param('hull', '#354e64', { label: 'Hull' });
const sailColor = param('sail', '#e8e2d2', { label: 'Sails' });
const trim = param('trim', '#c57a3d', { label: 'Deck trim' });
presets({ classic: { hull: '#354e64', sail: '#e8e2d2' }, regatta: { hull: '#e7e1d5', sail: '#d54c3c', trim: '#284e62' } });

const hull = assembly('sailboat');
const outline = (l: number, w: number, depth: number, z: number) => extrudePolygon([
  [0, l / 2], [w * 0.32, l * 0.28], [w / 2, -l * 0.18], [w * 0.39, -l / 2],
  [-w * 0.39, -l / 2], [-w / 2, -l * 0.18], [-w * 0.32, l * 0.28],
], depth).translate(0, 0, z);
hull.part('keel', box(90, 480, 240, true).translate(0, -180, 120).color(hullColor));
hull.part('hull', outline(1900, 560, 220, 240).color(hullColor));
hull.part('deck', outline(1720, 495, 65, 460).color(trim));
hull.part('mast', cylinder(930, 24, 8).translate(0, 170, 525).color(trim));
hull.part('boom', box(28, 570, 28, true).rotateZ(90).translate(0, 120, 650).color(trim));
const mainsail = extrudePolygon([[0, 0], [0, 810], [430, 80]], 16).rotateX(90).translate(0, 160, 555);
hull.part('mainsail', mainsail.color(sailColor));
if (rig.value === 'sloop') {
  hull.part('jib', extrudePolygon([[0, 0], [0, 470], [-260, 60]], 14).rotateX(90).translate(0, 160, 555).color(sailColor));
}
hull.part('helm', cylinder(35, 85, 8).translate(0, -600, 525).color(trim));
return hull.model();
