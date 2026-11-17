const [profile] = await lib.fromDXF('spline-profile.dxf');

return profile.extrude(3);
