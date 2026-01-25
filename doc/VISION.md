# Project Blueprint: kernelCAD.com
**The Git-Native, Code-Forward CAD for the Web.**

## 1. Executive Summary
kernelCAD is a browser-native parametric CAD platform built on WebAssembly. It bridges the gap between traditional mechanical engineering and modern software development workflows. Unlike incumbents (Fusion 360, Onshape) that lock data in binary vaults, kernelCAD treats geometry as code—enabling Git-based version control, programmatic design, and community-driven extensibility.

## 2. The Problem (Market Gaps)
The current CAD landscape forces a trade-off between Power, Accessibility, and Workflow:
- **The "Black Box" Problem**: Traditional CAD files (Fusion, SolidWorks) are binary blobs. You cannot "diff" them, merge them meaningfully, or track changes line-by-line. Hardware teams cannot use modern CI/CD or Git workflows.
- **The "Cloud Tax" & Lock-in**: Onshape and Fusion 360 are powerful but expensive (~$1.5k+/yr for commercial). Free tiers are restrictive or temporary. Offline access is poor or non-existent.
- **The "UI/Code" Divide**: Tools are either purely GUI (Fusion) or purely Code (OpenSCAD). There is no "VS Code for CAD" that allows a user to sketch a bracket with a mouse and tweak its fillet radius via Python script simultaneously.

## 3. The Solution: kernelCAD
kernelCAD is the "Figma meets GitHub" for hardware design.

Please refer to the following documents for detailed information:

-   [Roadmap](./ROADMAP.md) - Current status and future plans.
-   [Architecture](./ARCHITECTURE.md) - Technical design and component overview.
-   [Release Strategy](./RELEASE_STRATEGY.md) - Deployment and release process.

## Technology Stack
- **Browser-Native Kernel**: Runs a C++/Rust B-Rep kernel compiled to WebAssembly (Wasm). This moves geometry calculation to the client side—ensuring privacy, offline capability, and zero latency.
- **Hybrid Interface**:
    - **Viewport**: Standard 3D manipulation.
    - **Code-View**: A live, bi-directional code editor (TypeScript/Python). Every GUI action generates clean, human-readable code.

### B. The "Killer Feature": Git for Geometry
- **Semantic Versioning**: Because the model is defined by code/text, kernelCAD supports true Git integration.
- **Branch & Merge**: Users can create feature branches, submit Pull Requests, and review visual diffs.

### C. AI & Extensibility
- **AI Copilot**: LLMs can "read" the part history to optimize designs or generate variants.
- **Plugin Ecosystem**: Open API for developers to write plugins in JavaScript/Wasm.

## 4. Market Positioning
| Feature | Fusion 360 / Onshape | OpenSCAD / FreeCAD | kernelCAD |
| :--- | :--- | :--- | :--- |
| **Platform** | Cloud/Desktop (Heavy) | Desktop (Local) | Browser (Wasm) |
| **Data Model** | Proprietary Database | Local Files | Git-Backed Text/Code |
| **Workflow** | Click-heavy | Code-heavy | Hybrid (Code + GUI) |
| **Extensibility** | Closed Add-ons | Python Scripts | NPM-style Packages |

## 5. Business Model
- **Freemium SaaS**: Free public projects, Pro ($20/mo) for private repos.
- **Enterprise**: On-premise deployment.
- **Marketplace**: 30% cut on paid plugins.

## 6. Execution Roadmap
- **Phase 1: The "Visual OpenSCAD" (MVP)** - Browser based CAD where you can code and click.
- **Phase 2: The "Github Connection"** - Login with GitHub, Save designs, Visual Diffing.
- **Phase 3: The Ecosystem** - Plugin Store, AI Design Assistant.

## 7. The Ask / Next Steps
- Validate Wasm kernel performance (MVP).
- Build the "Git-for-Hardware" engine.
