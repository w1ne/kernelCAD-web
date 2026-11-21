// One HATCH whose four boundary paths are edge chains, as AutoCAD writes a
// hatch picked from LINE, ARC and CIRCLE geometry: a 60 x 30 plate with r5
// rounded corners, a 20 x 6 slot with clockwise arc ends, and two 8 mm
// holes. hatch-edge-bracket.dxf holds the HATCH pairs written by ezdxf 1.4.5.
const [bracket] = await lib.fromDXF('hatch-edge-bracket.dxf');

return bracket.extrude(3);
