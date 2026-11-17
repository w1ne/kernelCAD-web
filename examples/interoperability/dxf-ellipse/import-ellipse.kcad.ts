const [profile] = await lib.fromDXF('ellipse-profile.dxf');

return profile.extrude(5);
