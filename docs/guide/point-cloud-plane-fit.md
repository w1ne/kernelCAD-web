# Fit a plane to scan points

The `fit_plane` MCP tool estimates an orthogonal least-squares plane from XYZ
triples supplied by the caller. It returns the centroid, deterministic unit
normal, signed distance for each input point, RMS distance and maximum absolute
distance. Points may come from parsed scan data or mesh vertices. Coordinates
are preserved in the input units.

```json
{
  "points": [[0, 0, 2.01], [10, 0, 1.99], [0, 10, 2.00], [10, 10, 2.02]]
}
```

This first slice reports plane parameters; it does not create a surface body or
parse XYZ/PLY files. At least three finite, non-collinear points are required.
