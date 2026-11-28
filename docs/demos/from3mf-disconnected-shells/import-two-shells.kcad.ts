// Run from this directory with the repository's disconnected-shell fixture.
const assembly = await lib.from3MF('./two-disconnected-solids.3mf');
const cut = assembly.subtract(cylinder(12, 2).translate(5, 5, -1));
return { assembly, cut };
