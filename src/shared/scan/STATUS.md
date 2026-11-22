# Scan reference status

`load_scan_reference` and `fit_model_to_scan` are the contract for this slice.
A loaded cloud is a non-BREP reference: bbox, centroid, and a fit against the
parametric model's existing bounding box. Booleans on the cloud are refused.
`lib.fromSTL` and `mesh_to_features` are unchanged and still the only promotion
path for a mesh.

Studio does not draw a points overlay or an AABB ghost. Wiring that through the
viewer would touch the player for a numeric fit the MCP tools already return.
