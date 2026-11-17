// Centred 10×20×30 mm block with a declared mass. Volume times the URDF
// default density (1000 kg/m³) is 0.006 kg. The export must use 0.055 kg
// and scale the inertia by the same factor.

const block = assembly('declared-mass');
block.part('block', box(10, 20, 30, true), { massKg: 0.055 });
