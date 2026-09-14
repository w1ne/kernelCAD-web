// BOM extraction example — one plate, three patterned standoffs, four
// catalog fasteners, and one bracket with no declared material.
//
// Demonstrates the three things inspect({ of: 'bom' }) / export({ format:
// 'bom-csv' | 'bom-json' }) are for:
//   - REAL instance counting: the standoff loop calls arm.part() three times
//     with distinct names (standoff_0..2) but the same source geometry — the
//     BOM groups them into ONE row with quantity 3, not three rows.
//   - purchased vs fabricated: the M2x4 screws are `lib.fetchPart(...)`
//     catalog parts (kind: 'purchased', a `catalog` block with id/license);
//     the plate/standoffs/bracket are `kind: 'fabricated'`.
//   - honest gaps: the bracket has no `material`/`density`, so its row's
//     `massG*` fields are null and a `bom.material.unassigned` diagnostic
//     names it — never a silently guessed water-density mass.
//
// Run with:
//   npx tsx -e "import('./src/agent/mcp/tools/inspectBom').then(async ({ inspectBomTool }) => { \
//     const r = await inspectBomTool({ file: 'examples/bom/panel-with-fasteners.kcad.ts' }); \
//     if (!r.ok) { console.error('FAILED:', r.error); process.exitCode = 1; return; } \
//     for (const row of r.rows) console.log(row.item, row.name, 'x' + row.quantity, row.kind, \
//       row.material ?? '(no material)', row.massGTotal === null ? 'mass=?' : 'mass=' + row.massGTotal.toFixed(1) + 'g'); \
//     console.log('totals:', JSON.stringify(r.totals)); \
//     console.log('diagnostics:', r.diagnostics.map(d => d.code)); \
//   })"
//
// Expected output:
//   1 plate x1 fabricated aluminum mass=194.4g
//   2 standoff_0 x3 fabricated pla mass=10.5g
//   3 bracket x1 fabricated (no material) mass=?
//   4 screw_0 x4 purchased (no material) mass=?
//   totals: {"partCount":9,"uniquePartCount":4,"totalMassG":204.918}
//   diagnostics: [ 'bom.material.unassigned' ]

const arm = assembly('panel');

arm.part('plate', box(200, 120, 3), { material: 'aluminum' });

for (let i = 0; i < 3; i++) {
  arm.part(`standoff_${i}`, cylinder(4, 15), {
    at: [20 + i * 60, 10, 3],
    material: 'pla',
  });
}

// No material/density declared on purpose — triggers bom.material.unassigned.
arm.part('bracket', box(30, 10, 4), { at: [0, 90, 3] });

for (let i = 0; i < 4; i++) {
  const screw = await lib.fetchPart('iso-4762-m2x4');
  arm.part(`screw_${i}`, screw, { at: [20 + i * 60, 110, 3] });
}

return arm.model();
