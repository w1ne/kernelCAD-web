// Run from this directory with the adjacent generic-cube.3mf file.
const source = await lib.from3MF('./generic-cube.3mf');
const drilled = source.subtract(cylinder(10.2, 2).translate(5, 5, -0.1));
return { source, drilled };
