// One HATCH whose boundary edges include a spline and elliptic arcs: a
// 60 x 20 plate whose top edge is a cubic spline edge with a 15 mm bump, an
// elliptic hole with 10 x 4 semi-axes, and a D-shaped hole closed by a
// clockwise half-ellipse edge. hatch-curved-edge-plate.dxf holds the HATCH
// pairs written by ezdxf 1.4.5 as R2010, so the spline edge carries fit data.
const [plate] = await lib.fromDXF('hatch-curved-edge-plate.dxf');

return plate.extrude(3);
