# kernelCAD - Agentic CAD Platform
 
 **kernelCAD** is a **Headless-First CAD Platform** designed for AI Agents.
 
 It provides a robust, scriptable API for agents to generate, analyze, and modify 3D geometry using the OpenCASCADE kernel. A web-based "Visual Debugger" allows human engineers to verify and tweak the agent's output.
 
 ## Philosophy
 1.  **Agent-Driven**: The primary interface is the `AgentAPI` (Node.js/TS), not the mouse.
 2.  **Verifiable**: Geometry is produced by deterministic code, not manual clicks.
 3.  **Visual Debugging**: Humans trust what they can see. The Web App acts as a high-fidelity viewer for the headless core.
 
 ## Features
 
 -   **Headless Core**: Run CAD operations in Node.js or Web Workers without a DOM.
 -   **Agent API**: JSON-serializable commands, introspection, and feedback loops.
 -   **Visual Debugger**: Real-time 3D preview powered by React Three Fiber.
 -   **Standard Exports**: STEP/STL generation.
 -   **Robust Kernel**: Built on OpenCASCADE (via Replicad).
  
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

That's it. For agents: `kernelcad mcp` runs an MCP server with 13 introspection tools. See `SKILL.md` (bundled with the install) for the full API surface and authoring guide.

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
