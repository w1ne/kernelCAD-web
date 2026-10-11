# Print-in-place hinge

A two-leaf hinge that prints assembled. The pin axis runs along X at y = 0,
z = 3. Each leaf is a 40 × 25 mm plate, 2 mm thick, lying flat on the XY
plane: leaf A on the -Y side, leaf B on the +Y side. The knuckles are 6 mm
in diameter around the pin axis. Leaf A has two outer knuckles (x = 0 to
10 and x = 30 to 40) joined by a 2 mm pin that runs from x = -2 to x = 42,
so it sticks out 2 mm past both ends; leaf B has the middle knuckle
(x = 15 to 25) with a 2.4 mm bore around the pin. That leaves a visible 5 mm
gap between the knuckles, 0.2 mm radial clearance between pin and bore, and
0.2 mm between each plate and the other leaf's knuckle, so the leaves never
touch. The hinge rotates about the pin from flat (0°) to folded (180°).

Model it as an assembly with parts `leafA` and `leafB` joined by a revolute
joint on the pin axis with limits 0° to 180°. Millimetres, Z up, hinge flat.

The checker measures: both parts and their sizes, the knuckles, pin and
bore, the gaps, a revolute mate between the leaves with 180° of
travel, no overlap, and a STEP export.
