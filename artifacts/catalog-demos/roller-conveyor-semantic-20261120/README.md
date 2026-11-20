# Roller conveyor repair

The original asset rotated every roller into the conveyor travel axis. Nine overlapping cylinders therefore rendered as one long tube. Its deck and side rails were also separated from the support posts.

The repair rotates the nine rollers across travel, adds separate axles, aligns six supports under the side rails and connects three cross ties. The open roller bed has two end stops. It remains an illustrative scene prop, not a load-rated conveyor design.

The native GLB tests measure roller orientation and pitch, separation, side-frame coverage and vertical/lateral support contact. They check the default and scale limits 0.65 and 1.35. The unchanged source failed the new orientation test. A fresh production render must match the committed preview.

See `verification.json` for measured numbers and invocation, `before.kcad.ts` for the negative control, and `comparison.mp4` for the visually inspected six-second still comparison.
