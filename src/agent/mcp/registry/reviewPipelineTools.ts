// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateSdfTool } from '../tools/evaluateSdf';
import { designLoopTool } from '../tools/designLoop';
import { reviewCadTool } from '../tools/reviewCad';
import { reviewPaintPeekLatestTool } from '../tools/reviewPaint';
import { flattenPatternTool } from '../tools/flattenPattern';
import { captureAnimationTool } from '../tools/captureAnimation';
import { renderPreviewTool } from '../tools/renderPreview';
import type { ToolRegistryEntry } from './types';

export const reviewPipelineToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'review_cad',
      description: 'Use this when you need to review a mechanism for fitness and repair mode. Run the deterministic CAD review loop: evaluate the script, validate the assembly/mate graph, check mate connectors touch modeled material, sample declared mate limits, optionally check interferences at sampled poses, report connector workspace bounds, and return a mechanism fitness verdict for agent self-review. Fitness includes repairMode: none, local-fix, parameter-tune, or topology-redesign.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          assembly: { type: 'string', description: 'Assembly name; defaults to the first captured assembly.' },
          designGoal: { type: 'string', description: 'Original user design prompt or goal. Included in suggestedRepairPrompt so topology-redesign repairs restart from the intended physical design instead of local coordinate nudges.' },
          preserveInterfaces: {
            type: 'array',
            description: 'External mates, connector refs, part names, or behavioral interfaces the repair agent must preserve during redesign.',
            items: { type: 'string' },
          },
          includePoseEnvelope: { type: 'boolean', description: 'Whether to sample declared mate limits. Default true.' },
          includeInterference: { type: 'boolean', description: 'Whether sampled poses run BREP interference checks. Default true.' },
          requirePhysicalUseCase: {
            type: 'boolean',
            description: 'When true, articulated assemblies must declare arm.physicalUseCase(...) evidence: loads, contacts, stable parts, and actuator limits.',
          },
          includePhysicalUseCaseReachability: {
            type: 'boolean',
            description: 'Run targeted physical-use-case reachability sampling over scalar-limited mates named in actuatorLimits. Reject contacts that cannot get within criteria.maxSlipMm and multi-contact use cases that cannot satisfy every contact in the same sampled actuator pose. Samples revolute/cylindrical/pin-slot limitsDeg and prismatic limitsMm. Defaults to requirePhysicalUseCase.',
          },
          includePhysicalUseCaseStatics: {
            type: 'boolean',
            description: 'Run opt-in pose-bound quasi-static certification at the exact common-contact samples: conservative friction/capacity, world force and moment balance, and finite-difference revolute actuator torque. Returns physicalUseCaseStaticCertificates on success; sampled linearized failures remain blocking diagnostics.',
          },
          includePhysicalUseCaseJointReactions: {
            type: 'boolean',
            description: 'Derive exact-pose reaction wrenches through uniquely rooted articulated trees and compare every loaded mate against a complete declared resultant force/moment envelope. Implies physical-use-case reachability and statics.',
          },
          includePhysicalUseCaseJointStructure: {
            type: 'boolean',
            description: 'Run geometry/material clevis double-shear, pin-bending, bearing, tear-out, and net-section checks with minimum factor of safety 2. Unsupported axial or perpendicular-moment load cases remain blockers. Implies joint reactions, statics, and reachability.',
          },
          physicalUseCaseReachabilitySamplesPerMate: {
            type: 'integer',
            minimum: 1,
            description: 'Samples per scalar-limited actuator mate for physical-use-case contact reachability. Samples revolute/cylindrical/pin-slot limitsDeg and prismatic limitsMm. Default 3; total targeted combinations are capped.',
          },
          samplesPerMate: {
            type: 'integer',
            minimum: 1,
            description: 'Pose-envelope samples per declared-limit mate. 1 (default) = corners only; >=3 adds uniform interior points between min and max. Total samples per non-locked mate = samplesPerMate.',
          },
          combinatorial: {
            type: 'boolean',
            description: 'Sample all 2^N limit-corner combinations across mates with declared limits. Capped at 8 mates with limits; combine with samplesPerMate for both interior coverage and worst-pose detection. Default false.',
          },
          epsilonMm3: { type: 'number', description: 'Interference volume threshold in mm^3. Default 0.01.' },
          trackConnectors: {
            type: 'array',
            description: 'Optional connector refs such as ["gripper-plate.tool-tip"] to limit connector workspace reporting.',
            items: { type: 'string' },
          },
          gripperAperture: {
            type: 'object',
            description: 'Optional fingertip connector refs for gripper aperture travel reporting.',
            properties: {
              left: { type: 'string', description: 'Left fingertip connector ref such as "left-finger.tip".' },
              right: { type: 'string', description: 'Right fingertip connector ref such as "right-finger.tip".' },
            },
          },
        },
      },
    },
    handler: input => reviewCadTool(input as unknown as Parameters<typeof reviewCadTool>[0]),
  },
  {
    definition: {
      name: 'review_paint_peek_latest',
      description:
        'Use this when you need to see the latest region the user painted in Studio. ' +
        'Return the newest inpainting-style review packet the user painted in Studio. ' +
        'Studio writes packets to <scriptPath>.review-paint/latest/ as the user marks regions ' +
        'over the 3D viewport; this tool scans the known kernelCAD-web checkouts and returns the ' +
        'freshest one within a configurable freshness window (default 30 minutes). Returns base64 ' +
        'PNGs of the screenshot + mask in-band so any MCP client can see the marked regions ' +
        'without local-disk Read access. The packet also carries the user\'s intent — an optional ' +
        'one-line note and preset tags (e.g. "too thick", "missing", "wrong angle") describing ' +
        'WHAT is wrong, not just where. Call this whenever the user says "look at my mark", ' +
        '"check what I painted", or any equivalent.',
      inputSchema: {
        type: 'object',
        properties: {
          freshness_sec: {
            type: 'integer',
            description: 'Maximum packet age in seconds. Default 1800 (30 min). Use a smaller value for "what did I just paint" or a larger one for "earlier today".',
            minimum: 1,
          },
          extra_roots: {
            type: 'array',
            description: 'Optional extra checkout paths to scan (in addition to ~/projects/kernelCAD-web and ~/projects/kernelCAD-web-worktrees). Use when Studio is hosted from a non-standard location.',
            items: { type: 'string' },
          },
          paths_only: {
            type: 'boolean',
            description: 'When true, omit base64 PNG fields and return only paths + metadata. Smaller response when the agent will Read the PNGs from disk anyway, or just wants to know "is there a packet".',
          },
        },
      },
    },
    handler: input => reviewPaintPeekLatestTool(input as Parameters<typeof reviewPaintPeekLatestTool>[0]),
  },
  {
    definition: {
      name: 'design_loop',
      description: 'Use this when you need to run a CAD design loop over multiple attempts. Run an agent CAD design loop over one or more attempt scripts: review each attempt with review_cad, continue past functional attempts that still have unresolved review warnings, return structured repair prompts, and optionally write a Studio-compatible build record JSON for visual replay.',
      inputSchema: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'Original user design goal. Fed into every review_cad repair prompt.' },
          attempts: {
            type: 'array',
            description: 'Ordered design attempts. Each item is { id?, title?, file? or code?, visualReview? }. File attempts can be replayed by Studio build records.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                file: { type: 'string' },
                code: { type: 'string' },
                visualReview: {
                  type: 'object',
                  description: 'Evidence from the reviewing agent after rendering/opening screenshots. Accepted reviews must include screenshotPath, concrete findings, and all required checks passing.',
                  properties: {
                    accepted: { type: 'boolean' },
                    screenshotPath: { type: 'string' },
                    findings: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    checks: {
                      type: 'array',
                      description: 'Required checklist entries: main-object-count, proportions-match-reference, required-visible-features, no-stray-or-floating-geometry, attachment-plausibility, semantic-orientation-alignment, device-depth-and-construction, canonical-views-physically-coherent.',
                      items: {
                        type: 'object',
                        properties: {
                          code: { type: 'string' },
                          passed: { type: 'boolean' },
                          finding: { type: 'string' },
                          screenshotPath: { type: 'string' },
                        },
                        required: ['code', 'passed', 'finding'],
                      },
                    },
                  },
                  required: ['accepted', 'findings'],
                },
              },
            },
          },
          assembly: { type: 'string' },
          preserveInterfaces: {
            type: 'array',
            items: { type: 'string' },
            description: 'External mates, connector refs, part names, or behavioral interfaces the agent must preserve between attempts.',
          },
          includePoseEnvelope: { type: 'boolean', description: 'Forwarded to review_cad. Default true.' },
          includeInterference: { type: 'boolean', description: 'Forwarded to review_cad. Default true.' },
          samplesPerMate: {
            type: 'integer',
            minimum: 1,
            description: 'Pose-envelope samples per declared-limit mate. 1 (default) = corners only; >=3 adds uniform interior points between min and max. Total samples per non-locked mate = samplesPerMate.',
          },
          combinatorial: {
            type: 'boolean',
            description: 'Sample all 2^N limit-corner combinations across mates with declared limits. Capped at 8 mates with limits; combine with samplesPerMate for both interior coverage and worst-pose detection. Default false.',
          },
          epsilonMm3: { type: 'number', description: 'Forwarded to review_cad.' },
          trackConnectors: {
            type: 'array',
            items: { type: 'string' },
            description: 'Connector refs to track across sampled poses.',
          },
          gripperAperture: { type: 'object', description: 'Optional gripper aperture request forwarded to review_cad.' },
          stopOnPass: { type: 'boolean', description: 'Stop after the first attempt that is functional and passes the quality gate. Default true.' },
          requireVisualReview: { type: 'boolean', description: 'Require screenshot-backed visualReview with structured checks before accepting an attempt. Default true; set false only for explicit non-visual batch checks.' },
          requirePhysicalAcceptance: {
            type: 'boolean',
            description: 'Require declared physicalUseCase common-pose reachability and pose-bound quasi-static certification before accepting an attempt. Design-loop also enables this automatically when an attempt script calls physicalUseCase(...).',
          },
          allowReviewWarnings: {
            type: 'array',
            items: { type: 'string' },
            description: 'Warning diagnostic codes the original prompt explicitly allows. Other review warnings keep the loop iterating even if review_cad is functionally ok.',
          },
          outputRecordPath: { type: 'string', description: 'Optional JSON path to write a Studio-compatible build record.' },
          recordTitle: { type: 'string', description: 'Optional title for the build record.' },
        },
        required: ['goal', 'attempts'],
      },
    },
    handler: input => designLoopTool(input as unknown as Parameters<typeof designLoopTool>[0]),
  },
  {
    definition: {
      name: 'flatten_pattern',
      description:
        'Use this when you need the unfolded flat pattern of a bent sheet-metal part. ' +
        'Return the unfolded 2D flat-pattern of a bent sheet-metal Shape as a Region ' +
        '(outer polyline + holes + bend lines + sketch plane). Slice 1: at most 2 bends. ' +
        'Pass { file } or { code }; optional { featureId } to pick a specific Shape.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          code: { type: 'string' },
          featureId: { type: 'string' },
        },
      },
    },
    handler: input => flattenPatternTool(input as unknown as Parameters<typeof flattenPatternTool>[0]) as Promise<unknown>,
  },
  {
    definition: {
      name: 'evaluate_sdf',
      description:
        'Use this when you need to sample a signed-distance field at a point. ' +
        'Sample the signed distance from an in-script sdf.* field at a 3D point. ' +
        'Returns { distance, inside, aabb, kind }. Distance is in mm; negative = inside the surface, ' +
        '0 = exactly on the surface, positive = outside. Use this to verify SDF composition before ' +
        'calling sdf.materialize (which is the expensive step). The script must bind the SdfField via ' +
        "sdf.bind('<name>', field) and pass that name as fieldName. " +
        'Hint: pass either { file } or { code }, plus { fieldName, point: [x,y,z] }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          fieldName: { type: 'string', description: "sdf.bind binding name holding the SdfField." },
          point: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'Sample point [x, y, z] in mm.',
          },
        },
        required: ['fieldName', 'point'],
      },
    },
    handler: input => evaluateSdfTool(input as unknown as Parameters<typeof evaluateSdfTool>[0]),
  },
  {
    definition: {
      name: 'capture_animation',
      description:
        "Use this when you need to render a script's animation timeline to a video. " +
        "Capture a kernelCAD script's animationView({...}) timeline to an MP4 (ffmpeg) or a PNG frame sequence, " +
        'verifying the sampled poses for part interference. FILE ONLY: pass { file } (a .kcad.ts path) — there is no ' +
        '{ code } mode, because the capture engine renders from a file on disk (its relative lib.fromSTEP imports resolve ' +
        'against the script directory). MP4 by default; pass { frames_dir } to write frame-0000.png... and skip ffmpeg ' +
        'entirely (mutually exclusive with output_path). Animation-pose interference verification runs by default ' +
        '(keyframe times + segment midpoints) BEFORE any browser/ffmpeg cost; { no_verify: true } skips it and ' +
        '{ verify_every: n } additionally samples every n-th frame time. Pass { focus } or { hide } (arrays of feature ids ' +
        'or assembly part names, mutually exclusive) to isolate parts in the rendered frames — same semantics as ' +
        '`kernelcad render --focus/--hide`; visibility is render-only and does NOT affect the pose verification. ' +
        'Collisions DO NOT fail the call — the artifact ' +
        'is still written as evidence with ok: true; read verified: false + the collisions[] array. ' +
        'ENVIRONMENT REQUIREMENT (identical to `kernelcad render`): capture drives a headless browser against a running ' +
        'studio dev server reachable at http://localhost:5173 (or the VITE_PORT override); there is no bundled-static ' +
        'serving mode yet, so the same dev-server precondition applies in a production MCP install. ' +
        'Returns { ok, output_path, frame_count, duration_ms, fps, verified, verify_skipped?, collisions: [{ t_ms, a, b, volume_mm3 }], diagnostics }.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script with an animationView({...}) record. Required (no inline { code } mode).' },
          output_path: { type: 'string', description: 'MP4 output path; default <scriptDir>/<basename>-animation.mp4. Mutually exclusive with frames_dir.' },
          frames_dir: { type: 'string', description: 'PNG-sequence mode directory: write frame-0000.png... and skip ffmpeg. Mutually exclusive with output_path.' },
          fps: { type: 'number', description: "Override the animationView record's fps." },
          no_verify: { type: 'boolean', description: 'Skip the animation-pose interference verification (default: verify on).', default: false },
          verify_every: { type: 'integer', minimum: 1, description: 'Additionally verify at every n-th frame time of the fps schedule (unioned with the keyframe sample set).' },
          focus: { type: 'array', items: { type: 'string' }, description: 'Show only matching feature ids / assembly part names in the rendered frames. Mutually exclusive with hide. Render-only; does not affect pose verification.' },
          hide: { type: 'array', items: { type: 'string' }, description: 'Hide matching feature ids / assembly part names in the rendered frames. Mutually exclusive with focus. Render-only; does not affect pose verification.' },
        },
        required: ['file'],
      },
    },
    handler: input => captureAnimationTool(input as Parameters<typeof captureAnimationTool>[0]),
  },
  {
    definition: {
      name: 'render_preview',
      description:
        'Use this when you need to LOOK at a kernelCAD model — render its script to deterministic PNG views ' +
        'for visual self-check (the visual half of the evaluate → render → inspect → fix loop), with NO studio or ' +
        'dev server required. Pass { code } (inline source) or { file } (a .kcad.ts path), exactly one. ' +
        'Renders the canonical engineering views (front, right, top, iso — pass { views } for a subset, e.g. ["iso"] for ' +
        'fastest iteration) plus an optional { pose: "<az>,<el>" } arbitrary camera angle (degrees; az=0,el=0 is front, ' +
        '+az rotates CCW around +Z, +el lifts the camera). NO STUDIO / DEV-SERVER REQUIRED: a prebuilt static player ' +
        '(dist/headless-player) is served from an ephemeral local port automatically; a running studio dev server is used ' +
        'as fallback, and { base_url } forces one. The only environment dependency is playwright chromium ' +
        '(npx playwright install chromium). Pass { focus } or { hide } (arrays of feature ids or assembly part names, ' +
        'mutually exclusive) to isolate parts — same semantics as `kernelcad render --focus/--hide`. Pass ' +
        '{ section: { axis, position, flip? } } to cut a cross-section and inspect INTERIOR geometry (wall thickness, ' +
        'internal pockets, whether a bore runs through) rather than only the outer shell. PNGs are written to ' +
        '{ out_dir } (default: a fresh temp session directory) and returned as absolute paths with per-view camera ' +
        'descriptions (kernelCAD is Z-up). Mechanism truth runs first, same protocol as `kernelcad render`: a broken ' +
        'mechanism still renders but every tile is watermarked MECHANISM BROKEN (KERNELCAD_RENDER_STRICT=1 refuses ' +
        'instead); read { mechanism, mechanism_failure_codes }. The probe runs full BREP interference sweeps and can ' +
        'dominate latency on large assemblies — pass { no_mechanism_check: true } for fast iteration (the preview then ' +
        'reports mechanism: "unverified"; ignored under strict mode). Returns { ok, images: [{ name, path, description }], ' +
        'out_dir, bounds, mechanism, render_source, render_ms, diagnostics }. PATHS ARE LOCAL to the machine running the ' +
        'MCP server — local stdio clients read them directly; hosted/remote clients should use open_in_studio instead.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Inline kernelCAD script source. Mutually exclusive with file. Relative imports resolve against a temp dir — use file for scripts with relative lib.fromSTEP(...) imports.' },
          file: { type: 'string', description: 'Path to a .kcad.ts script on disk. Mutually exclusive with code.' },
          views: { type: 'array', items: { type: 'string', enum: ['front', 'right', 'top', 'iso'] }, description: 'Canonical views to render (default: all four). Fewer views = faster.' },
          pose: { type: 'string', description: "Extra arbitrary camera pose '<az>,<el>' in degrees, e.g. '30,20'." },
          focus: { type: 'array', items: { type: 'string' }, description: 'Show only matching feature ids / assembly part names. Mutually exclusive with hide.' },
          hide: { type: 'array', items: { type: 'string' }, description: 'Hide matching feature ids / assembly part names. Mutually exclusive with focus.' },
          out_dir: { type: 'string', description: 'Directory for the PNGs (created if missing). Default: a fresh temp session dir.' },
          width: { type: 'integer', minimum: 64, maximum: 2048, description: 'Per-view tile width in px (default 768).' },
          height: { type: 'integer', minimum: 64, maximum: 2048, description: 'Per-view tile height in px (default 768).' },
          environment: { type: 'string', description: "HDRI environment override: preset ('studio', 'softbox', 'neutral', 'outdoor', 'warehouse'), a URL, or 'none' for the default three-light rig." },
          no_watermark: { type: 'boolean', description: 'Suppress the kernelCAD version watermark.', default: false },
          no_mechanism_check: { type: 'boolean', description: "Skip the mechanism-truth probe for fast iteration on large assemblies; the preview reports mechanism: 'unverified'. Ignored under KERNELCAD_RENDER_STRICT=1.", default: false },
          base_url: { type: 'string', description: 'Advanced: force a specific render server (e.g. a running studio dev server) instead of the bundled static player.' },
          section: {
            type: 'object',
            description: "Cut the model with one axis-aligned section plane to inspect INTERIOR structure (wall thickness, internal pockets, whether a bore runs through) instead of only the outer shell. position is in mm along the axis (kernelCAD Z-up frame); flip keeps the +axis side (default keeps the -axis side).",
            properties: {
              axis: { type: 'string', enum: ['x', 'y', 'z'] },
              position: { type: 'number' },
              flip: { type: 'boolean', default: false },
            },
            required: ['axis', 'position'],
            additionalProperties: false,
          },
        },
      },
    },
    handler: input => renderPreviewTool(input as Parameters<typeof renderPreviewTool>[0]),
  },
];
