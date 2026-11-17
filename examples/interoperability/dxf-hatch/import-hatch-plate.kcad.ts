const [outline] = await lib.fromDXF('hatch-bulged-plate.dxf');

return outline.extrude(5);
