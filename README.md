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
  
## Getting Started

### Prerequisites

-   Node.js (v22.12.0+)
-   npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/w1ne/kernelCAD.git
    cd kernelCAD
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1.  **Write Code**: Use the editor on the left to define your shape.
    ```javascript
    const { Sketcher } = replicad;
    const base = new Sketcher().hLine(50).vLine(50).hLine(-50).close().extrude(20);
    return base.fillet(5);
    ```
2.  **View**: The 3D view updates automatically when you stop typing or save.
3.  **Export**: Click the download icons in the top-right to export STEP or STL files.

## Architecture

kernelCAD consists of three main parts:
1.  **Editor**: Monaco-based code editor.
2.  **Viewer**: Three.js/React-Three-Fiber viewport.
3.  **Engine**: A Web Worker that runs Replicad/OpenCASCADE to compute geometry asynchronously.

### Documentation Index

- **[Architecture](./doc/ARCHITECTURE.md)**: High-level system design and component overview.
- **[Refactoring Analysis](./doc/REFACTORING_ANALYSIS.md)**: Root-cause flow/logic gaps and staged refactor plan.
- **[CAD Engineering Standards](./doc/CAD_ENGINEERING_STANDARDS.md)**: Best-in-class CAD practices translated into kernelCAD implementation standards.
- **[Implementation Details](./doc/IMPLEMENTATION_DETAILS.md)**: Deep dive into the Visual Feedback System, Solver, and Code Generation.
- **[Interfaces & APIs](./doc/INTERFACES.md)**: Detailed API references for Extensibility.
- **[Roadmap](./doc/ROADMAP.md)**: Future plans and current status.
- **[Keyboard Shortcuts](./doc/KEYBOARD_SHORTCUTS.md)**: Speed up your workflow.
- **[CAD Query Guide](./doc/CAD_QUERY_GUIDE.md)**: Guide to robust selector-based modeling.
- **[Core Workflows](./doc/CORE_WORKFLOWS.md)**: Step-by-step user interaction references.
- **[Competitive Analysis](./doc/COMPETITIVE_ANALYSIS.md)**: Comparison with CascadeStudio and Chilli3D.

## License

MIT
