# Functional drawing coverage and engineering decisions

User-approved scope: extend the existing drawing review with declared functional dimension
coverage and unresolved engineering decisions, then publish native worked examples and
actual workflow demos. Keep the current one-click PDF download available.

## Engineering purpose

A sheet can have no overlapping labels and still omit the bore or interface dimension
that matters. Authors must be able to state which geometric callouts are required and why,
and reviewers must see missing coverage separately from drawing placement. Unknown fit,
datum or tolerance intent remains an explicit question until a person supplies a decision
and its provenance. A decision record does not create GD&T or certify manufacture.

This slice checks the declared scope. It does not discover every manufacturing-critical
feature, infer fits, learn drafting standards or certify dimensional correctness.

## Contract and source declaration

Add shared types and pure validation/evaluation under `src/shared/intent/`. The source
declares a shape-bound, virtual `.drawingReview(plan)` record. It follows the existing
`.dimension()`, `.datum()` and `.tolerance()` capture/upstream collection path and produces
no geometry. `.dimension({ id, ... })` gains a validated stable authored identifier.

```ts
type DrawingMeasurableKind = 'linear' | 'diameter' | 'radius' | 'angular';
interface DrawingDecisionResolution { note: string; provenance: string }
interface DrawingReviewPlan {
  id: string;
  requirements: {
    id: string;
    featureId: string;
    annotationId: string;
    expectedKind: DrawingMeasurableKind;
    role: 'critical' | 'reference';
    reason: string;
  }[];
  decisions: {
    id: string;
    kind: 'datum' | 'fit' | 'tolerance' | 'dimension' | 'other';
    featureId: string;
    prompt: string;
    resolution?: DrawingDecisionResolution;
  }[];
}
```

`featureId` is an author-defined description, not a resolved topology reference. Required
callouts use exact `authored:<id>` IDs of geometrically resolved dimensions. The first
slice supports the four source-authored measurable kinds; notes, datum symbols and
automatic callouts cannot stand in for a required measured dimension.

SVG/PDF options add `reviewPlans?: readonly DrawingReviewPlan[]`,
`decisionResolutions?: Readonly<Record<string, DrawingDecisionResolution>>` and
`requireCompleteReview?: boolean`. The shared `drawingDecisionKey(planId, decisionId)`
encodes each ID separately and joins them with a colon, preventing namespace collisions.
Source plans and option plans are merged; options cannot erase a source plan. Reject
duplicate plan IDs, requirement/decision IDs within each plan, unknown resolution keys,
unsupported kinds, malformed/unknown fields and empty/whitespace-only required strings.
Every plan needs at least one requirement or decision; reject an empty plan.
Valid option decision resolutions override an embedded source resolution. Malformed or
unknown option resolutions reject; they cannot silently restore a completed source record.

## Authoritative report and export behavior

The finalized drawing report adds `review`, evaluated after the final layout selection,
annotation suppression and authored/automatic report merge. Preserve source IDs in every
authored-dimension conversion path. For each declared requirement, join its exact ID
against all final report rows, requiring authored provenance as well as the ID/kind. A
declared plan must produce a report even when no annotations remain. Return one status:

- `missing`: no matching row;
- `ambiguous`: more than one matching row;
- `kind-mismatch`: the row is not the requested measured dimension kind;
- `hidden`: the callout was suppressed;
- `crowded`: it is still overlapped;
- `label-overridden`: a review text override replaced a critical callout's computed label;
- `covered`: a resolved, visible, readable geometric callout of the requested kind remains.

Critical failures block declared coverage. Reference failures remain visible as advisories.
Coverage is an explicit binding to geometric callouts, not validation of an arbitrary label
or the overall manufacturing design. A critical text replacement is conservative: restore
the computed label or change the source declaration before completing this review.

The report exposes requirement rows (plan ID, requirement ID, feature, role, reason,
annotation ID, expected kind, status), decision rows (plan ID, decision ID, kind, feature,
prompt, resolution/key), counts and `status: 'not-declared' | 'incomplete' | 'complete'`.
No-plan reports use `not-declared`, never a vacuous 100% completion claim. Every unresolved
declared decision blocks `complete`; a nonempty note/provenance resolves that record only.

Printable SVG preview and PDF must return the same report for the same source/options.
With `requireCompleteReview: true`, fail export unless a declared review is complete.
Normal SVG/PDF exports remain available and return incomplete reports/diagnostics without
pretending the sheet is reviewed. Architectural drawings must reject supplied review
plans, decision resolutions or a strict review request rather than silently ignore them.

## Studio behavior

Extend the existing modal with a focused functional-review panel and hook. Read the engine
report; do not infer coverage from label text, `byKind` or overlap totals. Show a compact
summary, requirement reasons/statuses with annotation selection, and decision prompts with
editable resolution note/provenance and an explicit Record decision action.

Keep one-click Download PDF unchanged. Offer the advanced Mark reviewed / Export reviewed
PDF workflow separately. A declared plan requires a fresh report with `complete` status,
no stale/missing overrides and explicit current review before the reviewed export. Send
`requireCompleteReview: true` for this declared reviewed export so the runtime also checks.

Persist decision overrides with the exact source fingerprint, outside reusable profile
presets. Source changes withhold them. Profile, tolerance, datum or dimension-strategy
changes reset stored decision confirmations; every effective source/options/decision edit
invalidates current human review, including change-then-revert. Late preview responses must
not re-enable review. Empty fields and unknown decision IDs cannot mark a decision complete.
Copy states that a resolution records intent/provenance; geometry and GD&T remain in source.

## Examples, blogs and real demos

Add named examples under `examples/functional-drafting/`, reusing the existing illustrative
plate and bearing-mount geometry. Declare stable measured dimensions, requirements and a
written example brief. Include a passing plate, a deliberately missing/hidden critical
dimension, and an unresolved bearing-interface decision plus a consistent illustrative
resolution. Independently assert geometry and report outcomes; a coverage pass is not
physical fit or manufacturing acceptance.

Publish two native articles, one for dimension coverage and one for engineering decisions,
with editable source, SVG/PDF, reports and readable screenshots. Each includes a short MP4
of the actual feature workflow. Retain source/settings, capture invocation, HTTP/report
evidence, video metadata and inspection evidence in a demo bundle. Keep the existing
one-click article intact and add discovery links through the established blog builder.
Do not name competitors in public copy or substitute rendered mockups for a product run.

## Validation and delivery

Meaningful engine tests cover validation, target scoping, source ID preservation, upstream/
option conflicts, fabricated/duplicate IDs, note/datum substitution, hidden/crowded/edited
labels, reference advisories, source changes, unknown/malformed resolutions, no-plan status,
strict export gating and identical printable SVG/PDF reports. Include a source-only runtime
fixture so plans need no frontend-only settings. Exercise CLI/MCP/hosted forwarding.

Studio tests cover the current ordinary PDF flow, coverage/decision gates, source/criteria
invalidation, persistence, change-then-revert and stale async results. Run focused tests,
typechecks, lint, quality ratchets and required CI; preserve one-way layering and thresholds.
Require specification then quality reviews before protected merge. Pin the hosted backend
to the exact merged public commit, verify its CI/deployment/health, then verify actual Studio
reviewed export and published desktop/mobile articles, assets and video playback. Track
merge, deployment and physical acceptance separately in the task ledger.
