// Run from this directory with the adjacent two-block-assembly.3mf file.
const assembly = await lib.from3MF('./two-block-assembly.3mf');
const drilled = assembly.subtract(cylinder(10.2, 2).translate(13, 9, -0.1));
return { assembly, drilled };
