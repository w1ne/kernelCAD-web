// One HATCH with six boundary paths: the outline, a window and four bolt
// holes. The importer returns the filled area as one profile with its holes.
const [gasket] = await lib.fromDXF('hatch-gasket.dxf');

return gasket.extrude(2);
