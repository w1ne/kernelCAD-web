# Build the front face of Ray-Ban Meta — Wayfarer

Reproduce the front face of a pair of Ray-Ban Meta smart glasses (Wayfarer variant) as a kernelCAD `.kcad.ts` script. A reference photo of the target product is at `eval/tasks/eyewear-wayfarer-front/reference.jpg` — open it before authoring.

Targets:

- Chunky black acetate body with smoothly curved outer silhouette — Wayfarer "wing" curves on the top-outer corners, gentle bottom curve. Not a rectangle with chamfered corners.
- Two trapezoidal lens openings with rounded inner+bottom corners. Top edge wider than bottom (Wayfarer taper).
- Asymmetric camera+LED on the LEFT side only: a single circular black camera lens (~8 mm dia) at the upper-outer corner of the left lens opening, recessed into the frame face; a single small LED dot (~1.5 mm) on the rim between the camera and the bridge. The right side has neither.
- A small bridge with a narrow nose-notch carved into its bottom edge.
- Omit temples (front face only).

Dimensions (mm, approximate): frame envelope ~150 × 50 × 10. Lens openings ~52 × 36 each. Bridge gap ~16 mm.

Return a single `Shape`. Z-up coordinates. Center at X=0.

The model's front face should sit at the smallest Y so the renderer's front view shows the camera-facing surface.
