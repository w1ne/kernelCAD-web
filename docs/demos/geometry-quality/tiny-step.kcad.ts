// SPDX-License-Identifier: MIT
// Synthetic validation part: a 0.01 mm projection creates tiny step faces/edges.
const body = box(20, 10, 5);
const step = box(0.01, 2, 0.01).translate(20, 4, 4.99);
return body.union(step);
