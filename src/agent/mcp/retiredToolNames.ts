/**
 * Tool names REMOVED from the public MCP surface (renamed, or merged into a
 * mode-parameterized tool). The consistency gate (toolNameConsistency.test.ts)
 * asserts that no teaching surface — SKILL.md, eval, docs, examples — references
 * any of these.
 *
 * Add a name here in the SAME commit that removes it from TOOL_REGISTRY and
 * sweeps its references. The map value is the replacement guidance surfaced in
 * the gate's failure message, so make it actionable (the exact new call form).
 *
 * Source of truth for the old→new mapping:
 *   kernelCAD-private/docs/specs/2026-06-13-mcp-surface-collapse-design.md §5
 */
export const RETIRED_TOOL_NAMES: Record<string, string> = {
  // Populated per family during the collapse. Example (lands in the verify task):
  //   validate_assembly: "use verify({ check: 'assembly' })",
};
