// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/dfm/voidTopology.ts
//
// W3 Task 6 — voxel void/channel topology over a part's export-grade mesh.
// One analyzeVoids() pass answers two printability questions:
//
//   1. Are there SEALED internal voids (trapped resin/powder, unprintable
//      pockets) the author did not declare?
//   2. Does the declared internal channel reach the outside through the
//      declared number of mouth openings?
//
// Algorithm:
//   1. Voxelize the solid S (voxelGrid.voxelize — X-column ray parity on a
//      grid padded by the closing radius + 2 voxels). Complement C = ¬S.
//      Outside air O = the components of C that touch the grid boundary
//      (the padding guarantees the entire boundary shell is air, so O is a
//      single flood from the boundary).
//   2. Sealed voids = 6-connected components of C \ O with ≥ 8 voxels
//      (anything smaller is rasterization noise along tessellated
//      surfaces). Each declared `sealed: true` channel consumes one
//      detected void, largest first; leftovers are reported as undeclared
//      sealed voids. This phase always runs — undeclared cavities must be
//      caught even when nothing is declared.
//   3. Mouth counting — only when a NON-sealed channel is declared:
//      morphological closing of S with radius r = ceil(8 mm / voxelMm)
//      voxels via two distance transforms: dilated = (edt2(S) ≤ r²),
//      closed = dilated ∧ (edt2(¬dilated) > r²). Channel candidate voxels
//      V = closed ∧ ¬S ∧ O — outside-connected air that the closing
//      sealed, i.e. the channel interior. The declared channel is taken to
//      be the LARGEST-volume 6-connected component of V. HEURISTIC
//      ASSUMPTION, not a guarantee: closing artifacts along convex hull
//      pockets are usually far smaller than a real channel, but a wide
//      CONCAVE pocket narrower than the ~16 mm closing diameter can
//      out-volume a small declared channel and win the pick —
//      `channelOpenings.channelSeed` exposes which component was chosen so
//      such misbinding is visible downstream. found = the number of
//      26-connected clusters of that channel's voxels 6-adjacent to
//      O ∧ ¬closed (open air beyond the closed hull) — each cluster is one
//      mouth. `partOpenings` additionally reports the count across ALL such
//      components (the whole part's openings), for parts whose openings are
//      disjoint (an enclosure's separate ports) and so cannot be one channel.
//
// Scope limits (this slice):
//   - ONE declared non-sealed channel per part drives `found`: the first
//     non-sealed entry in `channels` selects the mouth phase; the largest V
//     component is assumed to be that channel. Additional non-sealed
//     declarations are ignored (the Task 7 orchestrator enforces the
//     one-channel rule). `partOpenings` is part-level and declaration-free —
//     it sums mouths over every component ≥ MIN_VOID_VOXELS. Convex faces
//     yield no candidates and concave internal edges are absorbed into the
//     cavity component, so it does not over-count.
//   - Channels wider than ~2× the closing radius (≈ 16 mm) are NOT sealed
//     by the closing: V comes back empty and the result reports found: 0
//     (and partOpenings: 0). The openings-mismatch hint (Task 7) names this
//     case so authors don't chase a phantom blockage.
//   - Caller passes only the channels addressed to THIS part's mesh; no
//     part-name filtering happens here.

import type { DfmChannelSpec } from '../../../shared/intent/dfmSpecRecord';
import type { TriangleBvh, DfmMesh } from './meshBvh';
import {
  CLOSING_RADIUS_MM,
  components,
  edt2,
  samplePoint,
  voxelize,
  type VoxelGrid,
} from './voxelGrid';

/** Sealed-void components below this voxel count are rasterization noise. */
const MIN_VOID_VOXELS = 8;

export interface VoidTopologyResult {
  /** Sealed (not outside-connected) empty regions ≥ 8 voxels that no
   *  declared `sealed: true` channel accounts for, largest first.
   *  `location` is the sampled position of the component's seed voxel —
   *  always inside the void. */
  sealedVoids: { volumeMm3: number; location: [number, number, number] }[];
  /** Number of sealed-void components detected BEFORE declared
   *  `sealed: true` channels consumed them. Count-based consumption hides
   *  over-declaration from `sealedVoids` (declared 2 sealed, only 1 cavity
   *  → sealedVoids comes back empty); declaredSealed >
   *  detectedSealedVoidCount is the signal that at least one declared
   *  sealed channel has NO matching cavity. */
  detectedSealedVoidCount: number;
  /** Mouth-cluster count for the part's declared channel (undefined when no
   *  non-sealed channel is declared — mouth phase skipped). */
  channelOpenings?: {
    /** Mouths of the DECLARED channel (the largest outside-connected neck
     *  component). Single-channel semantics: "does this channel have N
     *  mouths?". The orchestrator compares this to the channel's declared
     *  `openings`. */
    found: number;
    /** Total mouths across EVERY narrow opening of the part (all neck
     *  components above the noise floor), not just the declared channel. For
     *  one connected channel this equals `found`; for a part with disjoint
     *  openings (an enclosure's separate port cutouts) it is the sum. Read
     *  this to gate "the enclosure has at least N external openings". */
    partOpenings: number;
    channelVolumeMm3: number;
    /** Summed interior volume of all counted opening components (the
     *  part-level analogue of channelVolumeMm3). */
    partChannelVolumeMm3: number;
    /** Sampled position of each mouth cluster's seed voxel (scan-order
     *  first voxel of the cluster — on the mouth, at the part surface).
     *  One entry per counted mouth; mismatch diagnostics can point here. */
    mouthLocations: [number, number, number][];
    /** Mouth seed positions for the part-level count (one per partOpenings). */
    partMouthLocations: [number, number, number][];
    /** Sampled position of the chosen channel component's seed voxel —
     *  always inside the channel the largest-component heuristic picked.
     *  Undefined when the closing sealed nothing (found: 0): there is no
     *  channel component to point at. Lets consumers see channel
     *  misbinding (heuristic picked a pocket, not the declared channel). */
    channelSeed?: [number, number, number];
  };
  /** Voxel edge length actually used (target 0.4 mm, grown under the
   *  2M-voxel budget). */
  voxelMm: number;
  /** Parity-cracked rasterization columns (see voxelGrid.VoxelGrid). */
  crackedColumns: number;
  /** Which phases ran. sealedVoids is always true (undeclared cavities must
   *  be caught unconditionally); mouthCount is true only when a non-sealed
   *  channel was declared — otherwise the closing EDTs and mouth clustering
   *  are skipped entirely (the zero-cost path). */
  phases: { sealedVoids: boolean; mouthCount: boolean };
}

/**
 * Analyze the void/channel topology of one part's export-grade mesh (the
 * part's LOCAL frame). `bvh` MUST have been built from `mesh` (same caveat
 * as checkMinWall). `channels` are the dfmSpec channel declarations for
 * this part. See the module header for the algorithm and scope limits.
 */
export function analyzeVoids(
  mesh: DfmMesh,
  bvh: TriangleBvh,
  channels: readonly DfmChannelSpec[],
): VoidTopologyResult {
  const grid = voxelize(mesh, bvh);
  const { nx, ny, nz, solid, voxelMm } = grid;
  const n = nx * ny * nz;
  const voxelVolMm3 = voxelMm ** 3;

  // --- Air components and the outside flood -------------------------------
  const air = new Uint8Array(n);
  for (let idx = 0; idx < n; idx++) air[idx] = solid[idx] ? 0 : 1;
  const airComps = components(air, grid, 6);

  // Outside components touch the grid boundary (the padded boundary shell
  // is always air, so this is exact). Everything else in C is sealed.
  const isOutsideComp = airComps.components.map(
    c =>
      c.bbox[0] === 0 || c.bbox[1] === 0 || c.bbox[2] === 0 ||
      c.bbox[3] === nx - 1 || c.bbox[4] === ny - 1 || c.bbox[5] === nz - 1,
  );

  // --- Phase 2: sealed voids ----------------------------------------------
  const voids = airComps.components
    .map((c, id) => ({ c, id }))
    .filter(({ c, id }) => !isOutsideComp[id] && c.voxelCount >= MIN_VOID_VOXELS)
    // Largest first; ties broken by scan-order seed for determinism.
    .sort((a, b) => b.c.voxelCount - a.c.voxelCount || a.c.seed - b.c.seed);

  const declaredSealed = channels.filter(ch => ch.sealed).length;
  const sealedVoids = voids.slice(declaredSealed).map(({ c }) => ({
    volumeMm3: c.voxelCount * voxelVolMm3,
    location: seedPoint(grid, c.seed),
  }));

  // --- Phase 3: mouth counting (only for a declared non-sealed channel) ---
  const openChannel = channels.find(ch => !ch.sealed);
  let channelOpenings: VoidTopologyResult['channelOpenings'];
  if (openChannel !== undefined) {
    channelOpenings = countMouths(grid, airComps.labels, isOutsideComp, voxelVolMm3);
  }

  return {
    sealedVoids,
    detectedSealedVoidCount: voids.length,
    ...(channelOpenings !== undefined ? { channelOpenings } : {}),
    voxelMm,
    crackedColumns: grid.crackedColumns,
    phases: { sealedVoids: true, mouthCount: openChannel !== undefined },
  };
}

/** Sampled position (mm, mesh frame) of a component's seed voxel. */
function seedPoint(grid: VoxelGrid, seed: number): [number, number, number] {
  const i = seed % grid.nx;
  const rest = (seed / grid.nx) | 0;
  return samplePoint(grid, i, rest % grid.ny, (rest / grid.ny) | 0);
}

/** Morphological closing + mouth clustering (algorithm step 3). */
function countMouths(
  grid: VoxelGrid,
  airLabels: Int32Array,
  isOutsideComp: boolean[],
  voxelVolMm3: number,
): NonNullable<VoidTopologyResult['channelOpenings']> {
  const { nx, ny, nz, solid, voxelMm } = grid;
  const n = nx * ny * nz;
  const r = Math.ceil(CLOSING_RADIUS_MM / voxelMm);
  const r2 = r * r;

  // closing(S) = erode(dilate(S, r), r), both via exact EDTs.
  const distToSolid = edt2(solid, grid);
  const dilated = new Uint8Array(n);
  const notDilated = new Uint8Array(n);
  for (let idx = 0; idx < n; idx++) {
    if (distToSolid[idx] <= r2) dilated[idx] = 1;
    else notDilated[idx] = 1;
  }
  const distToNotDilated = edt2(notDilated, grid);
  const closed = new Uint8Array(n);
  for (let idx = 0; idx < n; idx++) {
    if (dilated[idx] && distToNotDilated[idx] > r2) closed[idx] = 1;
  }

  // Channel candidates V = closed ∧ ¬S ∧ O.
  const isOutsideVoxel = (idx: number): boolean => {
    const label = airLabels[idx];
    return label >= 0 && isOutsideComp[label];
  };
  const candidates = new Uint8Array(n);
  for (let idx = 0; idx < n; idx++) {
    if (closed[idx] && !solid[idx] && isOutsideVoxel(idx)) candidates[idx] = 1;
  }

  // Channel candidates split into 6-connected components. `found` keeps the
  // SINGLE-CHANNEL contract — the declared channel binds to the largest
  // component and `found` is that one channel's mouths (verifying "does THIS
  // channel have N mouths?"). But a part can also carry SEVERAL independent
  // narrow openings that are not one connected channel — an enclosure's
  // separate port cutouts, two unrelated bores. `partOpenings` answers the
  // distinct part-level question "how many narrow openings does the WHOLE part
  // have?" by counting mouths across every component above the noise floor.
  // The two differ when openings are disjoint: an enclosure with 3 ports that
  // do not merge through its wide cavity has found:1 (largest neck) but
  // partOpenings:3. Enclosure-opening gates read partOpenings; single-channel
  // checks read found. Components below MIN_VOID_VOXELS are tessellation
  // specks; convex faces yield no candidates and concave internal edges are
  // absorbed into the cavity component, so partOpenings does not over-count.
  const vComps = components(candidates, grid, 6);
  const counted = new Uint8Array(vComps.components.length);
  let partVoxels = 0;
  let channelId = -1;
  let channelVoxels = 0;
  for (let id = 0; id < vComps.components.length; id++) {
    const vox = vComps.components[id].voxelCount;
    if (vox < MIN_VOID_VOXELS) continue;
    counted[id] = 1;
    partVoxels += vox;
    // Largest counted component is the declared channel; scan-order (ascending
    // seed) breaks ties deterministically (lowest seed wins).
    if (vox > channelVoxels) {
      channelVoxels = vox;
      channelId = id;
    }
  }
  if (channelId < 0) {
    // Closing sealed nothing above the noise floor — no channel narrower than
    // ~2r exists (either the part has no channel, or it is too wide for the
    // closing; the orchestrator's mismatch hint covers the wide case). No
    // channel component → no channelSeed to point at.
    return { found: 0, partOpenings: 0, channelVolumeMm3: 0, mouthLocations: [], partMouthLocations: [] };
  }

  // Mouth voxels: channel voxels 6-adjacent to open air beyond the closed hull
  // (O ∧ ¬closed); each 26-connected cluster is one mouth. Built twice over the
  // same adjacency rule: once restricted to the declared (largest) channel for
  // `found`, once over all counted components for `partOpenings`. Mouths of
  // distinct openings are spatially separate, so global clustering for the
  // part-level count yields the correct total.
  const sliceStride = nx * ny;
  const openAir = (idx: number): boolean => !closed[idx] && !solid[idx] && isOutsideVoxel(idx);
  const adjacentToOpenAir = (idx: number): boolean => {
    const i = idx % nx;
    const rest = (idx / nx) | 0;
    const j = rest % ny;
    const k = (rest / ny) | 0;
    return (
      (i > 0 && openAir(idx - 1)) || (i + 1 < nx && openAir(idx + 1)) ||
      (j > 0 && openAir(idx - nx)) || (j + 1 < ny && openAir(idx + nx)) ||
      (k > 0 && openAir(idx - sliceStride)) || (k + 1 < nz && openAir(idx + sliceStride))
    );
  };
  const channelMouth = new Uint8Array(n);
  const partMouth = new Uint8Array(n);
  for (let idx = 0; idx < n; idx++) {
    const label = vComps.labels[idx];
    if (label < 0 || !counted[label]) continue;
    if (!adjacentToOpenAir(idx)) continue;
    partMouth[idx] = 1;
    if (label === channelId) channelMouth[idx] = 1;
  }
  const channelClusters = components(channelMouth, grid, 26);
  const partClusters = components(partMouth, grid, 26);

  return {
    found: channelClusters.components.length,
    partOpenings: partClusters.components.length,
    channelVolumeMm3: channelVoxels * voxelVolMm3,
    partChannelVolumeMm3: partVoxels * voxelVolMm3,
    mouthLocations: channelClusters.components.map(c => seedPoint(grid, c.seed)),
    partMouthLocations: partClusters.components.map(c => seedPoint(grid, c.seed)),
    channelSeed: seedPoint(grid, vComps.components[channelId].seed),
  };
}
