# Adam-level quality bar (ChatGPT MCP path)

Competitor baseline: Adam (YC) — LLM → CadQuery/OpenSCAD → parametric solids.
Strong on mechanical brackets/housings; weak on organic surfacing and complex
assemblies that fail to compile. KernelCAD already has the stronger kernel
(OCCT BREP, NURBS, joints, STEP, CDN mesh/anim). This bar is about the **agent
path + gates + cookbooks**, not missing solids.

## Bar (must hold for ChatGPT MCP)

### 1. Mechanical mid-complexity (STRICTER than Adam fail cases)

Examples: bearing housing, gearbox-ish multi-feature enclosure.

- Compiles (`evaluate_script` ok)
- Clean BREP (no silent noop booleans; fillets/holes land)
- Editable `param()`s for load-bearing dimensions
- STEP-exportable
- Manufacturing-intent: walls (shell), fillets, hole patterns, bosses/pockets —
  not a stack of raw boxes

Prefer cookbooks: `multi-feature-machined-housing`, hole/fillet/shell recipes.
Avoid `union-of-stacked-primitives` when the prompt says real / production /
complex / enclosure / gearbox / housing.

### 2. Multi-body mechanism (open-chain)

- Bodies look like real machine elements (plates, towers, yokes — not sticks)
- Joints/connectors correct (`mechanism.orphan-part` must not ship)
- Mesh (+ optional anim) on CDN; paints in ChatGPT widget
- Prefer `design_loop` + `review_cad` until green; cookbook
  `multi-body-mechanism-real-proportions`

### 3. Organic body

Only via automotive / sew path (`automotive-body-envelope`,
`network-body-panels-via-sew`). Success claims require
`verify({ check: 'body-likeness' })` **publishReady** before
`open_in_studio` with `likeness_profile: 'automotive'` (hard gate).

## DX codes (likeness publish gate)

| Code | Meaning |
|------|---------|
| `reference.likeness.publish-blocked` | `open_in_studio` refused success claim — likeness not green |
| `reference.likeness.gate-required` | `design_loop` / profile set but body-likeness input missing |
| `reference.likeness.auto-failed` | AABB↔wheel automated check failed |
| `reference.likeness.stills-incomplete` | Required still codes missing |
| `reference.likeness.still-failed` | Still verdict failed or evidence too thin |

## Agent loop (complex builds)

For complex / production / enclosure / gearbox / robot-arm prompts:

1. `lookup_cookbook` (machined housing or mechanism proportions — not stacked toys)
2. Author → `evaluate_script` → fix
3. Prefer `design_loop({ goal, attempts, … })` — revise source on
   `nextActionPrompt` until `ok` or `convergence.escalate`
4. Organic: `likenessProfile: 'automotive'` + `verify({ check: 'body-likeness' })`
5. Final `open_in_studio` — pass `likeness_profile: 'automotive'` when organic
   (gate auto-runs / checks session attest)

WIP previews may omit likeness_profile; never claim likeness success without it.
