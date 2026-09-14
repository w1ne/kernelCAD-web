// Engineering material presets by name (mild-steel, aluminum-6061, pla) driving mass.
// Catalog keys are steel / aluminum / pla; this recipe maps the engineering names.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/cookbook-parity/engineering-material-presets-mass.kcad.ts
//
// Expected console output:
//   Features: 7
//   OK

// Engineering grade → mass-catalog key. FEA grades use the left-hand
// names; arm.part({ material }) and inspect({ of: 'mass', material })
// accept the catalog spelling on the right.
const PRESETS = {
  'mild-steel': 'steel',
  'aluminum-6061': 'aluminum',
  'pla': 'pla',
};

const arm = assembly('engineering-material-presets-mass');
arm.part('mild-steel-cube', box(20, 20, 20), { material: PRESETS['mild-steel'], at: [0, 0, 0] });
arm.part('aluminum-6061-cube', box(20, 20, 20), { material: PRESETS['aluminum-6061'], at: [40, 0, 0] });
arm.part('pla-cube', box(20, 20, 20), { material: PRESETS['pla'], at: [80, 0, 0] });
return arm.model();
