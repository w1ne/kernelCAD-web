// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/34: board-edge drill guide — 50 × 40 × 20 block, 18.4 × 12 channel, Ø6.2 guide.
const board = 18;
const fit = 0.2; // per side
const channelW = board + 2 * fit;
const channelD = 12;

// Drill the guide before the channel cut: afterwards 'top' also names the
// channel ceiling (it came from the same box face).
return box(50, 40, 20)
  .hole('top', { u: 0, v: 0, diameter: 6.2, depth: 'through', name: 'guide' })
  // An open channel crosses the whole bottom face, so it is a subtract with
  // 1 mm run-out at both ends (a cutout must stay inside its entry face).
  .subtract(box(52, channelW, channelD + 0.1).translate(-1, 20 - channelW / 2, -0.1));
