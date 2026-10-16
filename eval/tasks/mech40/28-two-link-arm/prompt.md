# Two-link arm on pin joints

A simple planar arm. A base block 40 × 40 × 20 mm sits centred on the origin
(on the XY plane). Link 1 is a flat bar 96 mm long, 16 mm wide and 8 mm
thick, lying on top of the base; it pivots about a vertical axis through the
base centre (x = 0, y = 0), and its pivot sits 8 mm in from its end, so it
reaches from x = -8 to x = 88. Link 2 is a 76 × 16 × 8 bar lying on top of
link 1, pivoting about a vertical axis 80 mm out along link 1 (x = 80), also
with its pivot 8 mm in from its end (x = 72 to 148). Both joints swing
±90°. Pose the arm straight out along +X.

Model it as an assembly with parts `base`, `link1`, `link2` and two revolute
joints (base–link1, link1–link2), each with limits -90° to 90°.
Millimetres, Z up.

The checker measures: the three parts and their sizes, the stacking
heights, the straight pose (reach to x = 148), two revolute mates with 180°
of travel, no overlap, and a STEP export.
