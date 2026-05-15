# Task: Circular Tab Array Around Hub

Build a cylindrical hub with a circular array of mounting tabs around its rim.

Functional requirements:

- Hub: cylinder radius 30 mm, height 10 mm. Z-up; axis along world Z. Anchor at origin (cylinder spans z = 0 .. 10).
- One source mounting tab: a small box 8 × 4 × 10 mm, translated so its inner edge sits flush with the hub rim at x = 30, centered on Y.
- Pattern the tab circularly around the hub's Z axis (`[0, 0, 1]`) for **6 instances** over a full 360°. Adjacent tabs at 60° spacing are far enough apart that none overlap.
- Union the source hub with the patterned tabs.

Return the combined hub.

Z-up, millimetres, degrees.
