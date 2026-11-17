const [profile] = await lib.fromDXF('partial-ellipse.dxf');

return profile.extrude(3);
