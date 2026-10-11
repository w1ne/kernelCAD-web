// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/23: module 1, 24 teeth, 20° involute spur gear, 8 mm face, Ø5 bore.
const teeth = 24; // spurGear takes a whole tooth count, not a ParamRef

return spurGear({ module: 1, teeth, faceWidth: 8, bore: 5, backlash: 0.1 });
