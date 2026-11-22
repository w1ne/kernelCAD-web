// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Multi-face shell: a 40 × 30 mm cable pass-through sleeve, 20 mm long,
// with a 2 mm wall and both ends open.

const block = box(40, 30, 20);
return block.shell(2, { face: ['top', 'bottom'] });
