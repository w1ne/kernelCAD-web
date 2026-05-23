# kernelCAD - CAD runtime for agents

**kernelCAD** turns mechanical intent into editable `.kcad.ts` source,
deterministic review evidence, and exportable manufacturing artifacts.

The core loop is source-first: design brief -> editable `.kcad.ts` ->
evaluated model -> deterministic validation -> guided revision -> export package.

kernelCAD is not trying to be a browser clone of Fusion, Onshape, or SolidWorks.
Replicad/OpenCASCADE are the kernel layer. kernelCAD is the agent-first workflow
layer above the kernel: deterministic CAD source, feature history, diagnostics,
validation, variants, and human review.

## Philosophy

1.  **Agent-First**: The primary interface is `.kcad.ts`, CLI, and MCP. The UI reviews and steers generated designs.
2.  **Editable Source**: Geometry is deterministic source code with explicit feature history, params, assemblies, and diagnostics.
3.  **Validation-Centered**: Useful CAD output needs deterministic review for constraints, hardware fit, clearances, and exportability.
4.  **Workflow Over Primitives**: Product progress is measured by intent-level workflows, not by copying every traditional CAD button.

## Agent workflow

For agents and contributors, `.kcad.ts` source is the design source of truth.
Rendered PNG/MP4 files, STEP/STL exports, score JSON, and capture-run metadata
are generated evidence or deliverables. Prompt briefs, source files, and
provenance metadata remain source. Change source first, regenerate explicit
targets, and avoid broad artifact refreshes unless you are intentionally
rebuilding a demo or release bundle.

Use deterministic checks before visual judgment:

```bash
kernelcad evaluate model.kcad.ts
# then run review_cad from an MCP client connected through `kernelcad mcp`
kernelcad export step model.kcad.ts -o model.step
kernelcad export stl model.kcad.ts -o model.stl
```

When a rendered artifact is produced, inspect the image/video itself and report
what is visible: proportions, interfaces, floating geometry, occlusion, camera
framing, and whether required features are legible. Passing tests are not a
substitute for visual evidence.

When visual evidence matters, keep a deterministic inspection bundle:

```bash
kernelcad render inspect model.kcad.ts model.inspect
```

The v1 bundle writes a manifest and canonical RGB views. It can also emit
machine-readable `mask`, `depth`, and `normals` channels:

```bash
kernelcad render inspect model.kcad.ts model.inspect --channels rgb,mask,depth,normals
```

Use `--focus <names>` or `--hide <names>` when a specific feature id or
assembly part needs isolated review. Keep richer channels in the same manifest
packet; do not replace the canonical RGB views.

For real hardware, prefer catalog/vendor geometry via `lib.fromSTEP(...)`
instead of fake placeholder boxes or cylinders. This keeps mounts, clearances,
and mechanism checks tied to physical components.

## Features

-   **Headless Core**: Run CAD operations in Node.js or Web Workers without a DOM.
-   **Agent API**: kernelCAD APIs for params, assemblies, NURBS, SDF bodies, sheet metal workflows, introspection, and feedback loops.
-   **Review Cockpit**: Browser-based 3D preview for inspecting generated designs and validation results.
-   **Standard Exports**: STEP/STL generation.
-   **Robust Kernel**: Built on OpenCASCADE, with Replicad kept as a kernel implementation detail where it is still used.
  
## Get Started

```bash
npm install -g kernelcad
```

Drop this in `bracket.kcad.ts`:

```typescript
const w = param('Width', 60, { unit: 'mm' });
const h = param('Height', 40, { unit: 'mm' });
const t = param('Thickness', 5, { unit: 'mm' });

const base = box(w, h, t);
const hole = cylinder(t + 2, 4).translate(w / 2, h / 2, -1);
return base.subtract(hole).fillet(1);
```

Run it:

```bash
kernelcad evaluate bracket.kcad.ts
kernelcad export stl bracket.kcad.ts -o bracket.stl
```

That's it. For agents: `kernelcad mcp` runs an MCP server with dynamic model
introspection tools. See `SKILL.md` (bundled with the install) for the full API
surface and authoring guide.

## Use with Claude Desktop

kernelCAD runs as an MCP server, so Claude Desktop can drive it locally. After
`npm install -g kernelcad`, add an entry to your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "kernelcad": {
      "command": "npx",
      "args": ["-y", "kernelcad", "mcp"]
    }
  }
}
```

Restart Claude Desktop. The kernelCAD MCP tools (`review_cad`, model
introspection, export helpers, etc.) appear in the tools list.

> A one-shot `kernelcad install --claude-desktop` command that edits this
> config for you is on the next slice — until then the snippet above is the
> interim path.

## Contributing

Web app + dev workflow (clone the repo, `npm install`, `npm run dev`) for contributors who want to hack on the kernel or the visual debugger:

```bash
git clone https://github.com/w1ne/kernelCAD-web.git
cd kernelCAD-web
npm install
npm run dev          # web visual debugger at localhost:5173
npm run build:cli    # build the CLI bundle into dist/cli/
npm run test         # full vitest suite
npm run qc           # quick quality gate (lint + typecheck + tests)
```

## License

MIT — see [LICENSE](LICENSE).
