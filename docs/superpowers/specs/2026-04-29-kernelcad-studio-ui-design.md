# kernelCAD Studio UI Design

**Date:** 2026-04-29  
**Status:** Draft, awaiting review  
**Repo:** `kernelCAD-web`  
**Strategy:** Incremental retrofit of the existing React workbench

## Purpose

Define the v0.1 Studio UI while preserving the north-star direction. The UI must make kernelCAD feel like a serious CAD environment and a code-first modeling tool at the same time.

The core product promise is:

- The `.kcad.ts` script is visible and canonical.
- The viewport gives immediate CAD feedback.
- Browser, timeline, editor, and diagnostics all describe the same model state.
- UI commands serialize back into code rather than creating a second model path.

This document focuses on the web Studio shell. It deliberately avoids command/kernel rewrites while Claude is working on the core architecture.

## Source References

Local references used for this design:

- `docs/superpowers/specs/2026-04-29-kernelcad-NORTHSTAR.md`
- `docs/superpowers/plans/2026-04-29-kernelcad-v0.1.md`
- `kernelCAD-private/research/fusion360/UI_LAYOUT_SPEC.md`
- `kernelCAD-private/research/fusion360/UI_WORKFLOW_REFERENCE.md`
- `kernelCAD-private/research/fusion360/MICRO_BEHAVIORS.md`
- `kernelCAD-private/research/fusion360/ux_crawl/results/MICRO_INTERACTIONS.md`
- `kernelCAD-private/research/fusion360/SELECTION_MODULE.md`
- `kernelCAD-private/research/fusion360/RENDERING_SELECTION_PIPELINE.md`
- `kernelCAD-private/research/fusion360/COMMAND_UNDO_ARCHITECTURE.md`
- `forgecad-pkg/package/README.md`
- `forgecad-pkg/package/dist/assets/app-J1SO_yGy.css`
- Current `kernelCAD-web/src/components/Layout/*`, `src/components/Toolbar.tsx`, `src/components/SceneBrowser.tsx`, and workbench contexts.

ForgeCAD is treated as a code-first product reference. Fusion 360 is treated as the CAD interaction/layout reference. kernelCAD should not clone either product visually; it should combine Fusion's proven spatial model with a script-first Studio identity.

## Decisions

| Decision | Choice |
|---|---|
| Design shape | Layered spec: v0.1 implementation plus north-star direction |
| Visual direction | Hybrid: Fusion layout, code-first tone |
| Default first screen | Split Studio: browser + viewport + Monaco visible together |
| Implementation strategy | Incremental retrofit of current shell |
| State library | Keep existing React Context for v0.1; no Zustand migration |
| Primary agent surface | External coding agents and script editing; in-app AI is secondary |

## v0.1 Scope

v0.1 UI work should produce a polished Studio shell around the current app:

- Hybrid top chrome with workspace tabs and a horizontal grouped ribbon.
- Split layout with Browser left, Viewport center, Monaco editor right.
- Lightweight timeline strip derived from current code/history extraction.
- Status bar showing active command, compute state, selection count, and diagnostics summary.
- Non-modal command panels anchored to the viewport.
- Layout modes: `Split`, `Viewport`, and `Code`.
- Shared selection between browser, timeline, viewport, and editor line jumps where current data supports it.
- Diagnostics surfaced in status, editor, and command panel validation.

v0.1 should not promise features that require unfinished core systems:

- Full rollback editing.
- Stable naming UI beyond current face/body ids.
- Complete properties editing for every feature.
- Inline sketch dimensions.
- Tangent-chain fillet.
- Box/crossing selection.
- Dependency-validated reorder.
- Full ViewCube and camera animation parity.

Those belong in the north-star sections and should be represented by compatible UI slots, not half-built behavior.

## Visual System

Default theme: hybrid Fusion/code-first.

Top chrome uses a light CAD surface:

- Header and ribbon use off-white/light gray backgrounds.
- Text is dark, active workspace uses a blue underline.
- Command buttons are icon-only with tooltips and shortcuts.
- Buttons use stable square hit targets around 32px.
- Groups are separated by thin vertical dividers and group labels.

Work surfaces use dark production panels:

- Viewport uses a dark neutral gradient, restrained grid, and visible axes.
- Browser, editor, timeline, and status use dark graphite surfaces with thin borders.
- Floating panels use a dark surface, 280-320px width, 8px maximum radius, and no nested card styling.
- Monaco remains a first-class work surface, not an optional debug panel.

Semantic colors:

| Meaning | Color Direction |
|---|---|
| Selection | Blue |
| Face hover/preselect | Lighter blue tint |
| Edge hover/preselect | High-contrast blue or orange, aligned with current viewer conventions |
| Snap/inference | Green |
| Warning | Amber |
| Error | Red |
| Preview geometry | Translucent cyan/blue |
| Suppressed/future rollback inactive | Gray, dimmed |

The UI should feel dense, quiet, and mechanical. Avoid marketing-style composition, decorative backgrounds, large hero typography, nested cards, and one-note saturated palettes.

## Primary Layout

The default Studio layout is Split Studio:

```text
┌────────────────────────────────────────────────────────────────────┐
│ Header: project, workspace tabs, command palette, undo/export/view │
├────────────────────────────────────────────────────────────────────┤
│ Ribbon: Create | Sketch | Modify | Construct | Inspect/View        │
├──────────────┬──────────────────────────────┬──────────────────────┤
│ Browser      │ Viewport                     │ Monaco editor        │
│ 240-260 px   │ largest remaining region     │ 36-42% default width │
├──────────────┴──────────────────────────────┴──────────────────────┤
│ Timeline strip                                                      │
├────────────────────────────────────────────────────────────────────┤
│ Status bar: prompt, selection, compute, diagnostics                 │
└────────────────────────────────────────────────────────────────────┘
```

### Header

Responsibilities:

- Show project/file identity.
- Show workspace tabs: `DESIGN`, `SKETCH`, later `ASSEMBLY`.
- Provide command palette / Design Shortcuts entry.
- Provide layout toggle: `Split`, `Viewport`, `Code`.
- Provide view mode controls: shaded, shaded with edges, wireframe.
- Provide undo/redo and export buttons.
- Show compute spinner only when evaluation is actually active.

The current `Code` / `GUI` mode should become a layout mode, not a product mode. Users should not feel that code and CAD are separate apps.

### Ribbon

The current vertical `Toolbar` becomes a horizontal grouped ribbon.

Initial groups:

- `Create`: Box, Cylinder, future Sphere/Torus.
- `Sketch`: Create Sketch, Sketch on Face, Show/Hide Sketches.
- `Modify`: Extrude, Revolve, Fillet, Chamfer, Boolean Cut/Union/Intersect.
- `Construct`: Offset Plane, Midplane, Tangent Plane.
- `Inspect/View`: fit/view controls, selection filters when available.

Rules:

- Icon-only direct buttons.
- Tooltips name the command and shortcut.
- Group labels can later open dropdowns containing less-used commands.
- Contextual tools may highlight when preconditions are available, such as selected face -> Sketch on Face / Extrude Face.

### Browser

The browser stays left and fixed around 240-260px. It remains collapsible.

v0.1 content:

- Construction/origin planes.
- History entries extracted from code.
- Visibility toggles.
- Rename/delete context actions where current AST mutation supports them.
- Selection and hover sync with viewport/editor.
- Health indicator slot: healthy, warning, error.

North-star additions:

- Nested sketches under consuming features.
- Dependency-aware reorder.
- Suppress/unsuppress.
- Edit feature.
- Find in viewport.
- Keyboard navigation: arrows, Enter, Delete, F2, Space.

### Viewport

The viewport remains the primary visual region. It should receive the highest interaction polish budget.

v0.1 requirements:

- Visible by default in Split Studio.
- Face selection prompt appears in status and as a restrained viewport hint, not a bouncing modal pill.
- Hover/preselect and selection colors align with the semantic color table.
- Preview geometry remains translucent.
- Command panels anchor to the viewport top-right by default.
- Empty state shows origin/construction planes instead of a blank void when feasible.

North-star additions:

- ViewCube with smooth standard view transitions.
- Selection filters for body/face/edge/vertex/sketch.
- Box and crossing selection.
- Inline manipulators for extrusion/fillet where backend supports preview.
- GPU picking for high-density scenes if raycaster performance becomes limiting.

### Monaco Editor

The editor is visible by default on the right at about 36-42% width.

v0.1 requirements:

- Collapse/expand available from header.
- User can switch to Code mode for full-width editor.
- Browser/timeline selection can jump to the relevant line.
- Diagnostics force editor visibility if code is broken.
- Editor is not hidden behind a tab by default.

North-star additions:

- Markers for compiler diagnostics tied to `ScriptLocation`.
- Inline parameter controls for `param()` declarations.
- Code lenses for feature records, export actions, and evaluation health.

### Timeline

The v0.1 timeline is lightweight and read-mostly.

v0.1 behavior:

- Horizontal strip pinned above the status bar.
- Cards show feature icon, truncated name, and health indicator.
- Clicking selects the feature and jumps/highlights corresponding browser/editor surface.
- Right-click offers safe current actions: Delete, Show/Hide, Rename where supported.
- No reorder or rollback unless the underlying graph supports it.

North-star behavior:

- Draggable rollback marker.
- Suppressed entries dimmed and struck through.
- Double-click feature edit with rollback.
- Dependency-validated reorder.
- Groups and timeline search/filter.

### Status Bar

The status bar must always answer four questions:

- What command is active?
- What should the user do next?
- Is computation running or stale?
- Are there warnings/errors?

Examples:

- `Ready | 3 bodies | Shaded + edges | No diagnostics`
- `Sketch: select plane | 0 selected | Waiting for input`
- `Extrude: select profile | Preview ready | Enter accepts, Esc cancels`
- `Error: line 14 failed | Showing last successful geometry`

## Interaction Model

### Command Entry

`S` opens Design Shortcuts / command palette. This matches Fusion's high-speed command entry while keeping kernelCAD script-first.

Direct ribbon buttons remain available for common operations. The command palette should show recent commands and fuzzy results, with the first result highlighted and Enter invoking it.

### Selection-First And Command-First

Where possible, both workflows must work:

- Select a face, then click Sketch or Extrude.
- Click Sketch or Extrude, then select the required face/profile.

Active command inputs should define selection requirements. In v0.1 this can be a UI convention using existing state; later it should become a formal command input schema.

### Command Panels

Command panels remain non-modal.

Rules:

- Anchor to viewport top-right.
- Stay 280-320px wide.
- Keep viewport orbit/pan usable unless the command explicitly captures the pointer.
- Enter accepts when valid.
- Escape cancels.
- Tab cycles fields.
- Numeric typing should focus the primary numeric field when a command is active and no text field already has focus.
- Validation appears inside the panel and in the status bar.
- Live preview updates when current code/preview infrastructure supports it.

### Shared Selection

Selection should synchronize across surfaces:

```text
Viewport click/hover
  -> selection state
  -> Browser row + timeline card + editor line reflect it

Browser/timeline click
  -> selection state
  -> viewport highlight + editor line jump

Editor line or diagnostic click
  -> selected history item where extractable
  -> browser/timeline reflect it
```

This is more important than adding more controls. A professional CAD UI feels coherent because every surface points to the same object.

### Sketch Mode

v0.1 keeps the current sketch overlay, but frames it in the shell as a contextual mode:

- Entering sketch mode switches workspace tab/ribbon to `SKETCH`.
- Status bar shows the current sketch tool and next action.
- Non-sketch geometry should dim where current rendering supports it.
- Finish/cancel sketch controls should be visible and keyboard-accessible.

North-star sketch interactions:

- Inline dimension input after dimension placement.
- Live width/height while drawing rectangles.
- Live distance/angle while drawing lines.
- Snap labels: endpoint, midpoint, center, intersection, on edge.
- Constraint icons and under/fully/over-constrained colors.
- Sketch palette on the right.

## State And Data Flow

No state-library migration is part of this UI pass. The UI should expose clear conceptual boundaries while remaining backed by the existing Context stack.

State boundaries:

- **Script state:** Monaco text is canonical. UI commands write code.
- **Evaluation state:** current revision, compute status, last successful result, diagnostics, stale response drops.
- **Selection state:** selected browser/timeline item, selected body/face/edge/sketch, hover/preselect, hidden ids.
- **Command state:** active command/panel, inputs, validation, preview geometry.
- **Layout state:** Split/Viewport/Code mode, browser visibility, editor width, timeline visibility.

Main model loop:

```text
Code edit or UI command
  -> evaluate script
  -> geometry + diagnostics
  -> viewport, browser, timeline, status, editor markers update
```

Selection loop:

```text
Viewport/browser/timeline/editor line
  -> shared selected item
  -> all visible surfaces reflect the same object
```

## Component Boundaries

v0.1 retrofit should touch the shell and interaction surfaces only.

Current components and target roles:

| Component | v0.1 Role |
|---|---|
| `WorkbenchLayout` | Owns the Split Studio shell and layout modes |
| `Header` | Project/workspace/control row |
| `Toolbar` | Horizontal grouped ribbon |
| `NavigationPanel` | Removed as a layout owner or reduced to a thin helper |
| `SidePanel` | Browser wrapper, not the primary AI assistant host |
| `SceneBrowser` | Browser tree with selection/visibility/history actions |
| `ViewerPanel` | Viewport frame, status hints, contextual overlays |
| `PanelManager` | Non-modal command panel layer |
| `FloatingPanel` | Shared command panel chrome |
| `TimelinePanel` | New lightweight AST/history-derived timeline |
| `StatusBar` | New prompt/selection/compute/diagnostics strip |

Do not move the app to `src/studio/` in this pass. That can be a later cleanup once the v0.1 core and shell stabilize.

## AI Assistant Placement

The browser should not default to an `AI ASSISTANT` tab. kernelCAD's primary agent surface is external coding agents editing `.kcad.ts` and using CLI/MCP. In-app AI can exist as a secondary panel later, but it should not compete with the model browser in the default Studio layout.

For v0.1:

- Remove AI from the default browser workflow.
- Keep existing AI components only if they do not clutter the main shell.
- Diagnostics and command feedback are higher priority than chat UI.

## Responsive Behavior

Desktop is the primary target.

Minimum desktop behavior:

- At wide widths, show Browser + Viewport + Editor.
- At medium widths, preserve Viewport and Editor, allow Browser collapse.
- At narrow widths, switch to one active surface with clear layout toggles.
- Ribbon buttons remain icon-only and do not wrap into unreadable text.
- Timeline/status remain accessible and do not overlap command panels.

No mobile-first redesign is part of this spec.

## Testing

Testing should match the blast radius.

Component tests:

- Header renders workspace tabs and layout controls.
- Ribbon renders grouped command buttons and calls `onToolClick`.
- Split layout renders Browser, Viewport, Monaco, Timeline, and Status by default.
- Layout toggles switch between Split, Viewport, and Code.
- Timeline renders history entries from `extractHistoryItems`.
- StatusBar renders ready, computing, and error states.

Interaction tests:

- Clicking Box/Cylinder inserts code and the browser/timeline receive entries after evaluation.
- Clicking a browser item selects it and jumps the editor.
- Clicking a timeline item selects the same item as the browser.
- Escape closes active panels and clears command hints.
- Diagnostics force editor visibility.
- Visibility toggle affects browser row state and viewport hidden ids.

Playwright checks:

- Desktop screenshot: no overlapping text in header/ribbon/browser/editor/timeline.
- Narrow screenshot: layout controls keep the app usable.
- Command panel screenshot: panel anchors over viewport, not editor.
- Error screenshot: diagnostics visible in status and editor.

## v0.1 Acceptance Demo

The UI pass is successful when this flow works:

1. Open Studio.
2. See Browser + Viewport + Monaco together by default.
3. Click Box or Cylinder from the horizontal ribbon.
4. Code updates.
5. Viewport computes.
6. Browser and Timeline show the new operation.
7. Select the operation in Browser; editor jumps to the line and viewport reflects selection where supported.
8. Open a command panel such as Extrude or Fillet where current functionality supports it.
9. Status bar shows command/compute/diagnostic state.
10. Collapse editor to Viewport mode, then restore Split mode.
11. Existing relevant tests pass.

## Risks

1. **Core/UI integration drift.** Claude is changing core architecture while this UI work is planned. Mitigation: retrofit only shell components and depend on current public workbench context APIs until core stabilizes.
2. **Timeline overpromising.** A visual timeline can imply rollback/reorder before support exists. Mitigation: v0.1 timeline is read-mostly and only exposes actions that are implemented.
3. **Editor visibility cost.** Split Studio can feel dense on smaller screens. Mitigation: provide clear layout toggles and remember user layout state later.
4. **AI panel clutter.** In-app AI can distract from the code-first model. Mitigation: do not place AI in the default browser path.
5. **State context sprawl.** Existing Context providers may become hard to reason about. Mitigation: define conceptual state boundaries now; migrate plumbing later only if a concrete UI feature is blocked.

## Implementation Sequencing

The implementation plan should be organized in this order:

1. Shell layout and layout modes.
2. Header and horizontal ribbon.
3. Browser cleanup and AI tab removal from default flow.
4. TimelinePanel read-only strip.
5. StatusBar.
6. Command panel anchoring/polish.
7. Selection sync improvements using current data.
8. Tests and screenshots.

Each step should leave Studio usable and avoid changing modeling core behavior.
