// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Preparation: npx tsx scripts/generateFastenerInstallationCatalog.ts assets/parts
// Locally authored purchased-part envelope catalog, simplified threads.
// Repair: set liftedHeadMm to 0, then rerun verify(check:'fastener-installation').
const liftedHeadMm = param('liftedHeadMm', 1.5, { min: 0, max: 3, unit: 'mm' });
const mount = assembly('l-bracket-mount');
const stations = [-12, 12];
let base = box(50, 34, 3, true).translate(0, 0, 1.5);
let bracket = box(38, 20, 3, true).translate(0, 0, 4.5)
  .union(box(38, 3, 24, true).translate(0, 8.5, 16.5));
for (const x of stations) {
  const drill = cylinder(8, 1.6).translate(x, 0, -.5);
  base = base.subtract(drill);
  bracket = bracket.subtract(drill);
}
mount.part('base', base.color('steel'));
mount.part('l-bracket', bracket.color('orange'));
for (let index = 0; index < stations.length; index++) {
  const x = stations[index];
  const name = index === 0 ? 'left' : 'right';
  mount.part(`${name}-washer`, (await lib.fetchPart('iso-7089-m3')).translate(x, 0, 6).color('steel'));
  mount.part(`${name}-nut`, (await lib.fetchPart('iso-4032-m3')).translate(x, 0, -2.4).color('steel'));
  const bearingZ = index === 0 ? 6.5 : liftedHeadMm.add(6.5);
  mount.part(`${name}-screw`, (await lib.fetchPart('iso-4762-m3x10')).color('steel'), { at: [x, 0, bearingZ] });
}
return mount.model();
