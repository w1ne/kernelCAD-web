// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { inspectTool } from '../tools/inspect';
import { queryTool } from '../tools/query';
import { verifyTool } from '../tools/verify';
import { whyDidThisFailTool } from '../tools/whyDidThisFail';
import { repairScriptTool } from '../tools/repairScript';
import type { ToolRegistryEntry } from './types';

const inspectToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'inspect',
    description:
      'Use this when you need to read facts about a model. One reader, selected by `of`:\n' +
      "- 'assembly' — physical assembly inventory (parts, bboxes, connectors, mates, disconnected solids).\n" +
      "- 'robot' — URDF/SDFormat export preview (links, joints, planning groups, end-effectors, issues).\n" +
      "- 'step' — inspect an imported STEP file: solid tree, exact bbox/volume, cylindrical holes (breached bores flagged partial; holeDetection: 'exact' | 'heuristic').\n" +
      "- 'shape' — volume / surfaceArea / bbox for one feature ({ feature_id? }).\n" +
      "- 'mass' — mass, centre of mass, centroidal inertia tensor (inertia6 + 3x3 inertiaMatrix), principalMoments/principalAxes, symmetry flags, and optionally the radius of gyration about an arbitrary axis ({ feature_id?, density?, gyration_axis? }); density in kg/m^3, defaults to 1000 (water).\n" +
      "- 'features' — features captured by the script (kind, id, params, transforms, suppression).\n" +
      "- 'assemblies' — assembly intent (assemblies, parts, connectors, joints).\n" +
      "- 'topology' — canonical face names + edge count for a feature ({ feature_id? }).\n" +
      "- 'edges' — edges of a shape with optional EdgeQuery ({ feature_id?, query? }); returns @kc[...] refs.\n" +
      "- 'face-edges' — boundary edges of a named canonical face ({ feature_id?, face_name }).\n" +
      "- 'faces' — faces of a shape with optional FaceQuery ({ feature_id?, query? }); returns @kc[...] refs.\n" +
      "- 'face-labels' — user-applied labels visible in the script.\n" +
      "- 'mates' — mates captured by the script.\n" +
      "- 'constraints' — sketch constraints captured by the script.\n" +
      "- 'part-stats' — bundled parts-catalog statistics.\n" +
      "- 'bend-table' — sheet-metal bend table for a flattened pattern.\n" +
      "- 'params' — declared model parameters.\n" +
      "- 'part-categories' — top-level part-catalog categories available in the bundled (and configured remote) catalog.\n" +
      "- 'part-families' — part families within a category ({ category? }); count + exemplar ids per family.\n" +
      "- 'bom' — bill of materials ({ assembly? }): one row per distinct part (grouped by geometry/catalog identity, not name) with real instance quantity, kind ('fabricated'|'purchased'), material, density, per-unit and total mass, bbox, a fabrication process (`process` + `processSource`), catalog provenance for purchased parts, and totals; `bom.*` diagnostics flag rows with no density source or missing catalog vendor info instead of guessing.\n" +
      "- 'section' — numeric cross-section probe of a shape: area, perimeter, loop/hole counts, 2D bbox at a plane ({ feature_id?, plane | at+axis, stack?: { from, to, count, axis? } }). `stack` scans evenly spaced slices and returns `minAreaIndex`/`minAreaPosition` — use it to find the neck/thinnest cross-section along an axis.\n" +
      "- 'continuity' — G0/G1/G2 classification of shared edges ({ feature_id?, edges? }); position gap, normal jump, curvature difference, worst-sample XYZ.\n" +
      "- 'curvature' — per-face Gaussian and mean curvature min/max/mean, inflections, spikes ({ feature_id?, faces?, spike_factor? }).\n" +
      "- 'multi-material' — explicit material leaves shadowed by later attributed boolean descendants, with assembly-part rewrite templates; analyzes capture records and does not change mesh attribution.\n" +
      'All params except `of` are subject-specific and forwarded verbatim. Most subjects accept { file | code }.',
    inputSchema: {
      type: 'object',
      properties: {
        of: {
          type: 'string',
          enum: ['assembly', 'robot', 'step', 'shape', 'mass', 'features', 'assemblies', 'topology', 'edges', 'face-edges', 'faces', 'face-labels', 'mates', 'constraints', 'part-stats', 'bend-table', 'params', 'part-categories', 'part-families', 'bom', 'section', 'continuity', 'curvature', 'multi-material'],
          description: 'Which facts to read.',
        },
        file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
        code: { type: 'string', description: 'Inline kernelCAD script source.' },
        assembly: { type: 'string', description: "of:'assembly'|'robot'|'bom' — assembly name; defaults to the first captured assembly." },
        feature_id: { type: 'string', description: "of:'shape'|'mass'|'topology'|'edges'|'faces'|'face-edges'|'face-labels' — FeatureId; defaults to the last returned shape." },
        density: { type: 'number', description: "of:'mass' — material density in kg/m^3 (steel 7850, aluminium 2700, ABS 1050). Defaults to 1000 (water); the response echoes the value used and flags when it was defaulted." },
        gyration_axis: {
          type: 'object',
          description: "of:'mass' — optional axis in shape-local mm to report the radius of gyration about. Omit for centroidal quantities only; the result is density-independent and returned in mm.",
          properties: {
            origin: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'A point on the axis, shape-local mm.' },
            direction: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Axis direction; normalised internally, so it need not be a unit vector.' },
          },
          required: ['origin', 'direction'],
        },
        face_name: { type: 'string', enum: ['top', 'bottom', 'left', 'right', 'front', 'back'], description: "of:'face-edges' — canonical face name (required for that subject)." },
        query: { type: 'object', description: "of:'edges'|'faces' — optional EdgeQuery/FaceQuery filter." },
        category: { type: 'string', description: "of:'part-families' — optional top-level category to filter families by." },
        plane: { type: ['string', 'object'], description: "of:'section' — section plane. Either a cardinal name string 'xy'|'xz'|'yz', { plane: 'xy'|'xz'|'yz', offset? }, or { origin: [x,y,z], normal: [nx,ny,nz] }. Omit to use `at`+`axis`." },
        at: { type: 'number', description: "of:'section' — single slice position along `axis` (mm)." },
        axis: { type: 'string', enum: ['x', 'y', 'z'], description: "of:'section' — normal axis for `at` / `stack` (default 'z')." },
        stack: {
          type: 'object',
          description: "of:'section' — dense scan: `count` slices evenly spaced from `from` to `to` along `axis`; response reports minAreaIndex/minAreaPosition.",
          properties: {
            from: { type: 'number', description: 'Start position along the axis (mm).' },
            to: { type: 'number', description: 'End position along the axis (mm).' },
            count: { type: 'integer', description: 'Number of evenly spaced slices (>= 1).' },
            axis: { type: 'string', enum: ['x', 'y', 'z'], description: "Scan axis (default 'z')." },
          },
          required: ['from', 'to', 'count'],
        },
        edges: { type: ['object', 'array', 'string'], description: "of:'continuity' — optional EdgeQuery or @kc[...] ref(s) limiting which shared edges are sampled." },
        faces: { type: ['object', 'array', 'string'], description: "of:'curvature' — optional FaceQuery or @kc[...] ref(s) limiting which faces are sampled." },
        spike_factor: { type: 'number', description: "of:'curvature' — spike sensitivity as a multiple of the face's Gaussian stddev (default 6)." },
      },
      required: ['of'],
    },
  },
  handler: input => inspectTool(input as unknown as Parameters<typeof inspectTool>[0]),
};

const verifyToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'verify',
    description:
      'Use this when you need to check a design against a rule set. One verifier, selected by `check`:\n' +
      "- 'assembly' — static assembly review ({ file | code }, or the session evaluate_script left): mate validator, default-pose interference, joint topology, mechanical plausibility. ok:false with `blocking[]` exactly when review_cad's blocking rules fire on these findings; review_cad also sweeps joint ranges and runs physics.\n" +
      "- 'urdf' — structural validity of a .urdf file ({ urdf_path }).\n" +
      "- 'dfm' — print-readiness gates declared by dfmSpec() ({ file | code }).\n" +
      "- 'assembly-path' — continuous straight-line removal of each assembly part along ±X/±Y/±Z and optional world-space directions. Returns valid directions, blocking parts and one of three states (removable / blocked / unknown); sequence peels the directional blocking graph and reverses it into a build sequence with a model stamp. Fastened-mate and fixed-connect clusters become subassemblies: each is planned recursively inside and installed as one unit at the top level (`Step.subassembly`). Remaining valid orders use deterministic heuristics (subassemblies first, outside-in, fewest reorientations, fewest tool changes); stuck sets get a budgeted blocking-reduction partition and a sampling fallback whose paths are labelled found-by-search, never proven. A fastener with a fastened-mate `fastener` declaration (axis, pitch, optional tool envelope) is tested along its helical path and reported `motion: helical`; a press/snap `fit` declaration becomes a `requires-force` step, never simulated. A modelled driver/socket/hex-key envelope swept along the approach axis adds `toolBlocked` { fastener, blockers } and a failing S2 ledger entry; unmodelled tools add nothing. Threaded fasteners without metadata stay unknown: non-straight-path. disassemblyOrder runs a deterministic greedy removal pass. Watertight mesh approximation, conservative contact, no rotation/mate/hardware certification.\n" +
      "- 'swept-collision' — sweep declared joint range(s) and report colliding poses.\n" +
      "- 'reachable' — inverse-kinematics reachability for an end-effector ({ tip_link, target_position, ... }).\n" +
      "- 'geometry-quality' — one solid body's BREP tiny faces and short edges (ids, locations, mm²/mm), plus sampled mirror symmetry about centroid XY/YZ/XZ and principal inertia planes ({ file | code, feature_id?, tiny_face_area_mm2?, tiny_face_relative?, short_edge_length_mm?, symmetry_tolerance_mm?, mesh_deflection_mm?, asserted_plane?: { origin, normal } }). Relative area is a fraction of total surface area; thresholds are ORed. Candidate planes are discovery; only an asserted plane gates symmetry. Approximate sampled tessellation, not exact BREP proof.\n" +
      "- 'fastener-installation' — measured explicit catalog-screw installation stations on lowered assembly BREP ({ file | code, fasteners:[{ part, against, engagementPart?, minEngagementMm?, maxProtrusionMm? }], toleranceMm?, angleToleranceDeg? }). Reports annular bearing gap, bore axis/diameter/overlap and receiver geometric engagement/protrusion. Unknown or zero coverage cannot pass. Simplified threads do not certify torque, preload or strength.\n" +
      "- 'mounting-holes' — fastened mates: hole pairs one screw can use (equal, or clearance over a tap drill / hole({ thread }) of the same metric size; hole-free faces are a rigid bond) and fastener holes meeting at the contact face are coaxial. Sides it cannot resolve are info, never mismatches.\n" +
      "- 'load-capacity' — will it hold? Closed-form Euler-Bernoulli beam check ({ loads, materials, ... }), or mode:'fea' to solve the script's feaStudy (quadratic-tet FEA, CalculiX) — both return { ok, safetyFactor, elements[{ partName, stressPa, yieldPa, safetyFactor }], failures[], diagnostics }; fea adds the threshold, the stress regions as @kc[...] faces with their location, and fea { peakStressPa, maxDisplacementMm, meshTrusted, peakAtSupportPa, refinement }; it refines the mesh automatically until the stress is trusted (refine: false for one solve).\n" +
      "- 'static-hold' — gravitational holding torque/force at a sampled pose grid vs each actuated joint's declared actuator capacity ({ joint?, pose?, gravity?, min_torque_margin_pct?, range_samples? }).\n" +
      "- 'motion-load' — loads on each driven joint (mechanicalJoint on a revolute mate) while the model moves: gravity, inertia from the animationView tracks (finite differences), optional external forces. Mass and inertia come from the solids and density/material, or a part's massKg. Returns per joint peak torque vs the mechanicalJoint torqueNm (margin; < 1x error, < 2x warning), axial / radial force and bending moment on the actuator shaft (checked only against radialLimitN / axialLimitN; without them 'no rating, not checked'), the radial load on each of up to two coaxial supports (each at its station on the shaft: the actuator at the joint origin, else the support's connector on the axis, else the middle of its material nearest the shaft; an ambiguous station is a mechanism.load.not-resolved warning, not a number), the worst pose, a torque-vs-time series, and `partLoads` (the worst wrench per part and side in that part's own frame, which `feaStudy({ loadsFrom })` consumes) ({ file | code, motion_mode?: 'tracks'|'range'|'poses', motion_poses?: [{ joint: value }], sample_ms?, range_samples?, quasi_static?, gravity?, motion_loads?: [{ part, point, force, fromMs?, toMs? }], supports?: { joint: [parts] }, series_points? }). Pass supports to compare with and without a bushing. Rigid bodies, tree mate graphs, no friction.\n" +
      "- 'physics' — full mechanism truth with physics engine: kinematic disconnect / interference / DOF checks plus static equilibrium and drop-on-release under gravity ({ file | code, assembly?, physics? }). Returns { ok, mechanism: 'real'|'broken'|'unverified', failures[], coverage }.\n" +
      "- 'edge-radius' — general edge-break specification on final BREP ({ file | code, min_radius_mm?, max_radius_mm?, require_edge_break?: 'external'|'internal'|'all', feature_id?, assembly?, parts?, edges?, faces? }). Reports sharp convex/concave edges, analytic cylindrical/toroidal fillet radii and spherical junctions, and heuristic planar chamfer strips. Radius bounds apply only to fillets; selectors/points are part-local. Unknown/empty coverage cannot pass.\n" +
      'All params except `check` are check-specific and forwarded verbatim; each check fails closed on its own missing required params.',
    inputSchema: {
      type: 'object',
      properties: {
        check: {
          type: 'string',
          description: 'Which verification to run. Omit only when passing call-time `requirements`; then the requirements ledger is the verification.',
          enum: ['assembly', 'urdf', 'dfm', 'swept-collision', 'reachable', 'mounting-holes', 'load-capacity', 'static-hold', 'motion-load', 'fastener-installation', 'geometry-quality', 'assembly-path', 'edge-radius', 'physics', 'requirements'],
        },
        requirements: {
          type: 'array',
          items: { type: 'object', additionalProperties: true },
          description:
            "Call-time external requirements ([{ name, predicate }]) measured in the same ledger as script require(), dfmSpec and feaStudy, tagged source: 'external' and never persisted. " +
            'The predicate is the serializable form of require(): { metric: clearance | distance | mass | volume | bbox | centerOfMass | count | innerLoops | angle | concentric | coplanar, a?, b?, op: gte | lte | eq | between | within, limit, tolerance?, density? }. ' +
            "Operands are { kind: body | faces | edges | part, ref: <feature id/name or part name>, query? }. With `check` omitted the ledger is the whole verification; check 'requirements' is the explicit form.",
        },
        file: { type: 'string', description: 'Path to a .kcad.ts script (assembly/dfm/swept-collision/reachable/mounting-holes/load-capacity/static-hold/geometry-quality/edge-radius/requirements).' },
        code: { type: 'string', description: 'Inline kernelCAD script source (same checks as `file`).' },
        feature_id: { type: 'string', description: "check:'geometry-quality' — body feature to measure; defaults to script return. check:'edge-radius' — lowered feature; default the returned model." },
        tiny_face_area_mm2: { type: 'number', minimum: 0, default: 0.01, description: "check:'geometry-quality' — flag faces strictly below this absolute area; zero disables." },
        tiny_face_relative: { type: 'number', minimum: 0, maximum: 1, default: 0, description: "check:'geometry-quality' — fraction of total BREP surface area, ORed with absolute threshold." },
        short_edge_length_mm: { type: 'number', minimum: 0, default: 0.1, description: "check:'geometry-quality' — flag edges strictly below this length; zero disables." },
        symmetry_tolerance_mm: { type: 'number', minimum: 0.000001, default: 0.05, description: "check:'geometry-quality' — maximum sampled mirror-to-mesh distance, mm." },
        mesh_deflection_mm: { type: 'number', minimum: 0.0000001, description: "check:'geometry-quality' — absolute mesh deflection, defaults to tolerance/4; must be <= tolerance/2." },
        asserted_plane: {
          type: 'object', additionalProperties: false, required: ['origin','normal'],
          description: "check:'geometry-quality' — optional required mirror plane in model coordinates; normal is normalized and must be nonzero.",
          properties: {
            origin: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
            normal: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
          },
        },
        assembly: { type: 'string', description: 'Assembly name; defaults to the first captured assembly.' },
        min_radius_mm: { type: 'number', minimum: 0, description: "check:'edge-radius' — minimum fillet radius in mm (does not imply sharp-edge prohibition)." },
        max_radius_mm: { type: 'number', minimum: 0, description: "check:'edge-radius' — maximum fillet radius in mm; must be >= min_radius_mm." },
        require_edge_break: { type: 'string', enum: ['external', 'internal', 'all'], description: "check:'edge-radius' — prohibit sharp convex/external, concave/internal, or all edges." },
        parts: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', minLength: 1 }, description: "check:'edge-radius' — explicit assembly part names (default all)." },
        edges: { type: ['object', 'array', 'string'], description: "check:'edge-radius' — EdgeQuery or @kc[...] edge ref(s); intersected with faces. Query near sorts, it does not filter." },
        faces: { type: ['object', 'array', 'string'], description: "check:'edge-radius' — FaceQuery or @kc[...] face ref(s); includes incident edges and fillets on selected faces." },
        fasteners: {
          type: 'array', description: "check:'fastener-installation' — explicit named stations; empty means no coverage.",
          items: { type: 'object', additionalProperties: false, properties: {
            part: { type: 'string', minLength: 1 },
            against: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', minLength: 1 } },
            engagementPart: { type: 'string', minLength: 1 },
            minEngagementMm: { type: 'number', minimum: 0, description: 'Declared geometric axial overlap minimum; no thread-strength claim.' },
            maxProtrusionMm: { type: 'number', minimum: 0 },
          }, required: ['part', 'against'] },
        },
        toleranceMm: { type: 'number', minimum: 0, description: "check:'fastener-installation' — linear tolerance, default .05 mm." },
        angleToleranceDeg: { type: 'number', minimum: 0, maximum: 90, description: "check:'fastener-installation' — axis tilt tolerance, default 1 degree." },
        urdf_path: { type: 'string', description: "check:'urdf' — path to the .urdf file." },
        directions: { type: 'array', maxItems: 64, items: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 }, description: "check:'assembly-path' — additional nonzero world-space removal vectors; normalized and deduplicated." },
        disassemblyOrder: { type: 'boolean', description: "check:'assembly-path' — iteratively remove freed parts and return removalOrder or stuckParts." },
        sequence: { type: 'boolean', description: "check:'assembly-path' — plan a build sequence { steps, model, unknown, search?, requiresForce?, toolBlocked? }. Fastened/fixed clusters become subassemblies planned inside and installed as one unit; steps carry the insertion direction (reverse removal), and may be motion: helical (declared fastener), requires-force (press/snap, not proven) or search. Stuck sets use a budgeted partition; non-straight paths found by sampling are labelled found-by-search and are not proven. Blocked and unknown parts are not reported as impossible." },
        threadedFasteners: { type: 'array', items: { type: 'string' }, description: "check:'assembly-path' — part names that need a helical removal. Catalog screw/bolt/nut families are detected automatically; without a fastened-mate fastener declaration (axis/pitch) they remain unknown: non-straight-path. Declare the motion on arm.mate(..., 'fastened', { fastener: { part, axis, pitchMm, tool? }, fit?: { kind, part? } })." },
        joint: { type: 'string', description: "check:'swept-collision' — joint to sweep; omit to sweep every declared joint. check:'static-hold' — joint to evaluate; omit to evaluate every joint with a declared actuator." },
        range: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: "check:'swept-collision' — [lower, upper, step] in joint-native units." },
        collision_tolerance_mm3: { type: 'number', description: "check:'swept-collision' — BREP intersection volume tolerance (mm^3)." },
        tip_link: { type: 'string', description: "check:'reachable' — end-effector part name (required for that check)." },
        target_position: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: "check:'reachable' — target [x, y, z] mm (world frame)." },
        target_orientation: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: "check:'reachable' — target XYZ Euler angles in radians." },
        position_tolerance_mm: { type: 'number', description: "check:'reachable' — position tolerance in mm." },
        orientation_tolerance_rad: { type: 'number', description: "check:'reachable' — orientation tolerance in radians." },
        prefer_solver: { type: 'string', enum: ['analytical', 'numeric', 'auto'], description: "check:'reachable' — force the IK path ('auto' default)." },
        max_iterations: { type: 'number', description: "check:'reachable' — numeric-path iteration cap." },
        seed: { type: 'object', description: "check:'reachable' — numeric IK seed pose (joint name -> deg/mm)." },
        loads: { type: 'object', description: "check:'load-capacity' — partName -> { force?: [Fx,Fy,Fz] N, torque?: [Tx,Ty,Tz] N*m }." },
        materials: { type: 'object', description: "check:'load-capacity' — partName -> material declaration." },
        mode: { type: 'string', enum: ['stub', 'beam', 'fea'], description: "check:'load-capacity' — 'beam' (default), 'stub', or 'fea' (solve the script's feaStudy: CalculiX + gmsh when installed, else the in-process voxel estimate)." },
        safety_factor_threshold: { type: 'number', description: "check:'load-capacity' — pass/fail safety-factor floor (default 1.5; mode 'fea': the study's minSafetyFactor when declared)." },
        study: { type: 'string', description: "check:'load-capacity' mode:'fea' — feaStudy name (default: the last declared one)." },
        mesh_size: { type: 'number', description: "check:'load-capacity' mode:'fea' — element size override, mm." },
        heatmaps: { type: 'boolean', description: "check:'load-capacity' mode:'fea' — also render stress heatmap PNGs (default false)." },
        refine: { type: 'boolean', description: "check:'load-capacity' mode:'fea' — one automatic finer pass (0.75x element size) when the stress is untrusted, inside the element budget (default true); false solves once at the study's meshSize." },
        pose: { type: ['object', 'array'], description: "check:'static-hold' — explicit pose (joint name -> deg/mm) or array of poses; omit to sample a grid across the evaluated joint's range." },
        gravity: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: "check:'static-hold' — gravity vector, m/s^2, world frame (default [0, 0, -9.81])." },
        min_torque_margin_pct: { type: 'number', description: "check:'static-hold' — safety-margin floor as a percent of actuator capacity (default 20)." },
        range_samples: { type: 'number', description: "check:'static-hold' — grid density per evaluated joint when `pose` is omitted (default 9). check:'motion-load' motion_mode:'range' — grid points per joint (default 5)." },
        motion_mode: { type: 'string', enum: ['tracks', 'range', 'poses'], description: "check:'motion-load' — 'tracks' (default): along the animationView timeline with inertia; 'range': quasi-static grid over each driven joint's limits; 'poses': exactly motion_poses (a user-named pose is one entry)." },
        motion_poses: { type: 'array', items: { type: 'object', additionalProperties: { type: 'number' } }, description: "check:'motion-load' motion_mode:'poses' — explicit mate poses, each an object of joint name -> value in degrees." },
        sample_ms: { type: 'number', description: "check:'motion-load' — timeline sample step, ms (default 20). Inertia peaks depend on it at keyframe velocity steps." },
        quasi_static: { type: 'boolean', description: "check:'motion-load' — drop velocity/acceleration terms (gravity and external loads only)." },
        motion_loads: {
          type: 'array',
          description: "check:'motion-load' — external forces: [{ part, point: [x,y,z] mm in the part's modeled frame, force: [Fx,Fy,Fz] N world, fromMs?, toMs? }].",
          items: { type: 'object', required: ['part', 'point', 'force'], properties: {
            part: { type: 'string' },
            point: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
            force: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
            fromMs: { type: 'number' },
            toMs: { type: 'number' },
          } },
        },
        supports: { type: 'object', description: "check:'motion-load' — mechanicalJoint name -> support part names to use instead of the declared supports (compare with / without a bushing)." },
        series_points: { type: 'number', description: "check:'motion-load' — max torque-vs-time points per joint in the result (default 120; 0 omits the series)." },
      },
      required: ['check'],
    },
  },
  handler: input => verifyTool(input as unknown as Parameters<typeof verifyTool>[0]),
};

const whyDidThisFailToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'why_did_this_fail',
    description: "Use this when you need to trace why a feature failed. Walk the upstream chain of a failing feature. Returns the diagnostics of the requested feature plus the diagnostics of every upstream feature in topological order (the requested feature is the last entry). Per-code hints are inline on every diagnostic — call lookup_diagnostics for the full catalogue. Pass { file?, code?, feature_id? }.",
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string' },
        code: { type: 'string' },
        feature_id: { type: 'string' },
      },
    },
  },
  handler: input => whyDidThisFailTool(input as Parameters<typeof whyDidThisFailTool>[0]),
};

const repairScriptToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'repair_script',
    description:
      'Use this when evaluate_script reported an error and you want the fix applied rather than described. ' +
      'Takes the candidates why_did_this_fail derives for a diagnostic, applies them one at a time, re-evaluates after each, ' +
      'and keeps the first that clears the diagnostic without introducing new errors. ' +
      'Never edits outside the repair region (failing feature statement + its input statements + the param() lines it reads) — an out-of-region patch is refused with tool.repair.out-of-region. ' +
      'Returns the repaired source in `new_code` (the caller persists it), a unified `diff`, and before/after health maps. ' +
      "Pass { file? | code?, diagnostic?: '<id>'|'first-error', strategy?: 'apply-first'|'try-all'|'dry-run', max_attempts?: number }.",
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
        code: { type: 'string', description: 'Inline kernelCAD script source.' },
        diagnostic: {
          type: 'string',
          description: "Diagnostic id from why_did_this_fail's `targetDiagnosticId` / `candidates[].diagnosticId`, or 'first-error' (default) for the first error-severity diagnostic.",
        },
        strategy: {
          type: 'string',
          enum: ['apply-first', 'try-all', 'dry-run'],
          description: "'try-all' (default) walks candidates until one clears the diagnostic; 'apply-first' applies only the top candidate and reports what it did; 'dry-run' previews every candidate patch without evaluating.",
        },
        max_attempts: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          description: 'Upper bound on candidates attempted (default 3). Ignored by apply-first and dry-run.',
        },
      },
    },
  },
  handler: input => repairScriptTool(input as Parameters<typeof repairScriptTool>[0]),
};

const queryToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'query',
    description:
      "Use this when you need to resolve or inspect topology against a script's lowered geometry. " +
      "Pass the script as `code` (inline; works on a hosted server) or `file`. Selected by `mode` (default 'evaluate'):\n" +
      "- 'evaluate' — list the faces a Query matches ({ query }). Pass expect:'unique' to assert exactly-one.\n" +
      "- 'resolve' — resolve one ref to one face ({ ref }).\n" +
      "- 'lineage' — the creating/modifying history of a face ({ ref }; feature_id defaults to the last feature).\n" +
      'Query forms (faces only; edge/vertex kinds return query.unsupported-entity-type):\n' +
      "- a bare face label: 'top', 'bottom', 'left', 'right', 'front', 'back', or a hole/cutout slot like 'wall'.\n" +
      "- @kc[<feature-id>/face/<label>] — feature ids are the ones refs print, e.g. '@kc[box_1/face/top]', '@kc[hole_1/face/wall]'.\n" +
      '- @kcq[face(<filter>, ...)] — filters AND together: createdBy("box_1"), withLabel("top"), geometryType(PLANE|CYLINDER|CONE|SPHERE|TORUS|BSPLINE_SURFACE), ' +
      'closestTo([x,y,z]) or closestTo([x,y,z], k), containsPoint([x,y,z]); combine with union(a, b), intersection(a, b), subtraction(a, b). ' +
      "Example: '@kcq[face(geometryType(CYLINDER), closestTo([0,0,10]))]'.\n" +
      'Each matched face comes back with its canonical @kc ref, centroid, normal and area.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['evaluate', 'resolve', 'lineage'], description: "Resolution mode (default 'evaluate')." },
        file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
        code: { type: 'string', description: 'Inline kernelCAD script source.' },
        query: { type: ['string', 'object'], description: "mode:'evaluate' — Query: a bare face label ('top'), an @kc[<feature-id>/face/<label>] ref, an @kcq[face(...)] expression, or { ast }." },
        ref: { type: 'string', description: "mode:'resolve'|'lineage' — one face: '@kc[box_1/face/top]', '@kcq[...]', or '<feature-id>.<label>' (lineage)." },
        expect: { type: 'string', enum: ['any', 'unique'], description: "mode:'evaluate' — 'unique' asserts exactly-one." },
        feature_id: { type: 'string', description: 'Optional FeatureId; defaults to the last lowered shape (use "auto" for lineage).' },
      },
    },
  },
  handler: input => queryTool(input as unknown as Parameters<typeof queryTool>[0]),
};

export const inspectionVerificationPreludeToolEntries: ToolRegistryEntry[] = [
  inspectToolEntry,
  verifyToolEntry,
  whyDidThisFailToolEntry,
];

export const inspectionVerificationQueryToolEntries: ToolRegistryEntry[] = [queryToolEntry];

/** Appended at the tail of the public registry: kernelCAD-server pins the
 *  historical tool ORDER as part of the registry contract, so a new tool joins
 *  at the end rather than next to its family. */
export const inspectionVerificationRepairToolEntries: ToolRegistryEntry[] = [repairScriptToolEntry];

// Aggregate export for tests and family-level audits. Production composition
// intentionally splits these entries to preserve the historical public order.
export const inspectionVerificationToolEntries: ToolRegistryEntry[] = [
  ...inspectionVerificationPreludeToolEntries,
  ...inspectionVerificationQueryToolEntries,
  ...inspectionVerificationRepairToolEntries,
];
