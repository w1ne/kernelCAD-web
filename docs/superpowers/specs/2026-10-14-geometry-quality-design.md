# Geometry quality checks

Extend MCP `verify` with `check: 'geometry-quality'`, backed by a modeling runtime checker on one OCCT solid. Resolve the script return value by default; `feature_id` selects an explicit captured body. Reject scenes, missing targets, non-solid geometry, malformed thresholds and failed measurements. No UI or kernel binding changes.

Report BREP faces strictly below max(tiny_face_area_mm2, tiny_face_relative * total BREP surface area), and edges strictly below short_edge_length_mm. Defaults: 0.01 mm², relative 0, 0.1 mm. Zero disables that threshold. Include feature-scoped enumeration ids/indices, locations in model coordinates, measured values and effective thresholds. Ids are rebuild-scoped, not durable topology references.
Explicit BREP degenerated edges (e.g. sphere poles) are reported separately with bounding-box centers and excluded from the physical short-edge gate; tiny lengths alone never imply degeneracy.

Extend the existing TriangleBvh with nearest point queries. Test every valid mesh triangle's vertices, edge midpoints and centroid reflected about XY/YZ/XZ planes through the volume centroid and the three principal inertia-axis normal planes. Retain coincident candidates with their provenance. Also test an optional asserted_plane { origin, normal }; normalize finite nonzero normals. Report max sampled deviation, RMS, sample count, worst source/reflected/closest points and triangle indices for each plane. Default tolerance 0.05 mm, absolute mesh deflection tolerance/4; positive explicit mesh deflection no greater than tolerance/2. Reject empty/degenerate or over-budget meshes (100,000 triangles) rather than undersample silently.

Candidate plane matches are discovery, not gates: asymmetric bodies can be valid. Overall ok requires no tiny faces or short edges and, when supplied, a passing asserted plane. Symmetry is approximate sampling of tessellation, never an exact BREP or hardware certification. No extra tolerance is added to the declared symmetry tolerance.

Alternatives considered: separate MCP tool duplicates verify discovery; exact mirrored boolean difference is expensive and tolerance-sensitive; inertia flags alone cannot establish surface symmetry. Existing BVH closest-point sampling offers explicit deviations and testable bounded work without a new dependency.

Validation: analytic nearest-point and brute-force BVH comparisons, real BREP sliver-step/short-edge tests, symmetric and asymmetric brackets, translated/rotated parts, invalid input and registry/router contracts. Documentation and a reproducible local checker-workflow MP4 evidence bundle accompany the change. Branch push only; deployment/live-page verification deferred until integration deploys it.
