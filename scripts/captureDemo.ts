/**
 * Demo capture pipeline.
 *
 * Drives the harness on a chosen corpus task with the agent loop visible
 * (terminal capture via asciinema/vhs), runs render_views mid-loop, stitches
 * into a GIF + side-by-side panel PNG.
 *
 * Owned by workstream #21 (visual verifier loop). Not yet implemented.
 *
 * Usage (when implemented):
 *   npm run capture-demo -- --task <task-id> --output docs/demos/v0.X/
 *
 * See `2026-05-03-v0.2-to-v1.0-gap-closure-roadmap-design.md` §H12.
 */

interface CaptureDemoOptions {
  task: string;
  output: string;
}

export async function captureDemo(options: CaptureDemoOptions): Promise<void> {
  throw new Error(
    `captureDemo: pending workstream #21 (visual verifier loop) implementation. ` +
      `Called with task=${options.task || '(unset)'}, output=${options.output || '(unset)'}. ` +
      `See docs/superpowers/specs/2026-05-03-v0.2-to-v1.0-gap-closure-roadmap-design.md §H12.`
  );
}
