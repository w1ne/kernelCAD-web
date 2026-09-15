// Engineering material presets by grade name (mild-steel, aluminum-6061, nylon)
// driving mass, default finish and the recorded part material. The same grade
// names feed feaStudy({ material }) and inspect({ of: 'mass', material }).
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/cookbook-parity/engineering-material-presets-mass.kcad.ts
//
// Expected console output:
//   Features: 7
//   OK

// One vocabulary: each grade seeds the part's density (mass / inertia), its
// default finish, and the material name the part records; feaStudy({ material })
// takes the same spelling. Bulk aliases (steel, aluminum, pet) resolve to these
// grades, and an unknown name fails listing the accepted ones.
const arm = assembly('engineering-material-presets-mass');
arm.part('mild-steel-cube', box(20, 20, 20), { material: 'mild-steel', at: [0, 0, 0] });
arm.part('aluminum-6061-cube', box(20, 20, 20), { material: 'aluminum-6061', at: [40, 0, 0] });
arm.part('nylon-cube', box(20, 20, 20), { material: 'nylon', at: [80, 0, 0] });
return arm.model();
