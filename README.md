# kernelCAD - AI-Native CAD Workbench

**kernelCAD** turns mechanical intent into validated, editable, manufacturable
design artifacts.

The core loop is: intent -> generated `.kcad.ts` -> rendered model ->
validation checks -> guided revision -> export package.

kernelCAD is not trying to be a browser clone of Fusion, Onshape, or SolidWorks,
and it is not just a Replicad wrapper. Replicad/OpenCASCADE are the kernel
layer. kernelCAD is the agent-first workflow layer above the kernel: deterministic
CAD source, feature history, diagnostics, validation, variants, and human review.

## Philosophy

1.  **Agent-First**: The primary interface is `.kcad.ts`, CLI, and MCP. The UI reviews and steers generated designs.
2.  **Verifiable**: Geometry is deterministic source code with explicit feature history and diagnostics.
3.  **Validation-Centered**: Useful CAD output needs checks for constraints, hardware fit, clearances, and exportability.
4.  **Workflow Over Primitives**: Product progress is measured by intent-level workflows, not by copying every traditional CAD button.

## Features

-   **Headless Core**: Run CAD operations in Node.js or Web Workers without a DOM.
-   **Agent API**: JSON-serializable commands, introspection, and feedback loops.
-   **Review Cockpit**: Browser-based 3D preview for inspecting generated designs and validation results.
-   **Standard Exports**: STEP/STL generation.
-   **Robust Kernel**: Built on OpenCASCADE (via Replicad).
-   **Product Plan**: See [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md) for the north star and v0.5 direction.
  
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
