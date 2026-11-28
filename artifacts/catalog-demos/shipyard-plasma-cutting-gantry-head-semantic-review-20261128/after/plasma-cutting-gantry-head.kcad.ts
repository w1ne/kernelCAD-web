// Plasma torch-head assembly for a CNC cutting gantry. A short bridge section
// carries the cross-slide and Z lifter; the torch, clamp and cable carrier are
// the working head. It is a component view, without the full cutting table,
// floor rails, extraction plant or operator station.
// Millimetres, Z up; bridge runs along X. The torch mounts on its -Y face
// and points down along -Z.
meta({
  name: "plasma-cutting-gantry-head",
  license: 'CC0-1.0',
  title: "Plasma cutting gantry head",
  description: "A CNC plasma torch-head assembly on a short local bridge section: profiled box beam, cross-slide guide rails and bearing blocks, a motorized Z lifter, torch clamp, down-facing plasma torch and segmented cable carrier. The editable finish controls cover painted steel, machined steel, polymer and the copper-alloy nozzle. Fresh-coat, weathered-yard and blue-machine presets are included. The full cutting table and machine are outside this asset.",
  tags: ["shipyard", "shipbuilding", "plasma cutting", "CNC", "gantry head", "torch height control", "torch carriage", "CC0"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteel = param('paintedSteel', '#e07a26', { label: 'Painted steel' });
const machinedSteel = param('machinedSteel', '#a8b0b4', { label: 'Machined steel' });
const cablePolymer = param('cablePolymer', '#26292c', { label: 'Cable polymer' });
const copperAlloy = param('copperAlloy', '#c78a45', { label: 'Copper-alloy nozzle' });

presets({
  'fresh-coat': { paintedSteel: '#f08a30', machinedSteel: '#c2c9cc', cablePolymer: '#2c3033', copperAlloy: '#d59a53' },
  'weathered-yard': { paintedSteel: '#b5642c', machinedSteel: '#8a8f90', cablePolymer: '#2a2a2a', copperAlloy: '#936b45' },
  'blue-machine': { paintedSteel: '#2f62a6', machinedSteel: '#b7c0c5', cablePolymer: '#30343a', copperAlloy: '#c78a45' },
});

const head = assembly("plasma-cutting-gantry-head");
const add = (name, shape) => head.part(name, shape.translate(0, 0, -100).scale(scale));
const blk = (x0, y0, z0, x1, y1, z1) =>
  box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const ngon = (r, n) => {
  let outline = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) outline = outline.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return outline.close();
};
const lathe = (sections, sides = 12) => ngon(sections[0][0], sides).loft(sections.slice(1).map(([radius]) => ngon(radius, sides)), {
  planes: sections.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});

// A short profiled beam makes the head's mounting interface visible without
// turning the asset into a complete cutting machine.
const bridge = path()
  .moveTo(-650, 930).lineTo(650, 930).lineTo(650, 1145).lineTo(605, 1190)
  .lineTo(-605, 1190).lineTo(-650, 1145).close()
  .extrude(220).rotateX(90).translate(0, 110, 0);
add('bridge-section', bridge.color(paintedSteel));
for (const side of [-1, 1]) {
  add(`bridge-end-cap-${side}`, blk(side < 0 ? -680 : 650, -112, 955, side < 0 ? -650 : 680, 112, 1165).color(machinedSteel));
}

// Cross-slide guides, bearing blocks and carriage plate.
for (const z of [980, 1120]) {
  add(`cross-slide-guide-${z}`, blk(-640, -132, z, 640, -110, z + 30).color(machinedSteel));
  for (const x of [-500, -390, 390, 500]) {
    add(`guide-bearing-${z}-${x}`, blk(x - 42, -174, z - 10, x + 42, -132, z + 40).color(machinedSteel));
  }
}
add('torch-carriage-plate', blk(-170, -220, 965, 170, -174, 1160).color(paintedSteel));
add('cross-slide-cover', blk(-130, -258, 1000, 130, -220, 1135).color(machinedSteel));
add('cross-slide-drive-motor', lathe([[38, 0], [48, 14], [48, 105], [38, 118]], 12)
  .rotateX(90).translate(-98, -258, 1112).color(cablePolymer));
add('cross-slide-gearbox', blk(-148, -280, 1070, -48, -258, 1155).color(machinedSteel));

// Vertical Z lifter, guide rails, moving slide and the torch holder.
add('lifter-column', blk(-82, -350, 365, 82, -270, 965).color(machinedSteel));
for (const x of [-64, 64]) {
  add(`lifter-guide-${x}`, blk(x - 11, -370, 375, x + 11, -350, 955).color(machinedSteel));
  add(`lifter-slide-block-${x}`, blk(x - 34, -405, 505, x + 34, -370, 755).color(paintedSteel));
}
add('lifter-slide-plate', blk(-112, -405, 500, 112, -370, 760).color(paintedSteel));
add('lifter-top-cap', blk(-92, -365, 945, 92, -255, 985).color(paintedSteel));
add('lifter-motor', lathe([[46, 0], [58, 12], [58, 112], [46, 124]], 12)
  .translate(0, -310, 985).color(cablePolymer));
add('torch-holder-back', blk(-94, -405, 410, 94, -370, 520).color(machinedSteel));
add('torch-holder-front', blk(-78, -493, 410, 78, -473, 520).color(paintedSteel));
for (const x of [-98, 98]) {
  add(`torch-holder-ear-${x}`, blk(x - 18, -470, 410, x + 18, -405, 520).color(paintedSteel));
  add(`torch-holder-bolt-${x}`, lathe([[8, 0], [8, 28]], 8).rotateX(90).translate(x, -478, 465).color(machinedSteel));
}

// The down-facing torch has a shaped barrel, a separate shield/nozzle, and a
// polymer lead returning to the moving head.
add('torch-body', lathe([[22, 155], [31, 174], [34, 220], [27, 250], [27, 418]], 12)
  .translate(0, -438, 0).color(cablePolymer));
add('torch-shield-cup', lathe([[19, 122], [27, 145], [31, 172]], 12)
  .translate(0, -438, 0).color(machinedSteel));
add('torch-nozzle', lathe([[8, 100], [14, 122], [19, 145]], 10)
  .translate(0, -438, 0).color(copperAlloy));
add('torch-lead', lathe([[14, 418], [17, 448], [17, 750]], 10)
  .translate(0, -438, 0).color(cablePolymer));

// A short segmented carrier and tray show how service cables follow the
// carriage; the omitted remainder belongs to the complete machine.
add('carrier-tray', blk(-620, -112, 1190, -20, -72, 1218).color(machinedSteel));
for (let i = 0; i < 10; i++) {
  const x = -600 + i * 58;
  add(`carrier-link-${i}`, blk(x, -108, 1218, x + 48, -76, 1258).color(cablePolymer));
}
add('carrier-head-bracket', blk(-44, -118, 1160, 12, -72, 1225).color(paintedSteel));
add('lead-guard', blk(-24, -438, 744, 24, -402, 785).color(cablePolymer));

return head.model();
