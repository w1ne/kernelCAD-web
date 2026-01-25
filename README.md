# kernelCAD

**kernelCAD** is a modern, browser-based programmatic CAD tool powered by the OpenCASCADE kernel (via Replicad). It allows you to define 3D geometry using standard JavaScript code and view the results instantly.

![kernelCAD Demo](https://via.placeholder.com/800x450?text=kernelCAD+Demo)

## Features

-   **Code-First Design**: Define geometry using a powerful JavaScript API.
-   **Instant Feedback**: Real-time 3D preview powered by React Three Fiber.
-   **Robust Kernel**: Built on top of OpenCASCADE, the industry-standard CAD kernel.
-   **Performance**: Geometry processing runs in a **Web Worker** to keep the UI responsive.
-   **Standard Exports**: Download your designs as **STEP** (for CNC/CAM) or **STL** (for 3D printing).
-   **Modern UI**: Sleek, dark-mode interface built with Tailwind CSS and Monaco Editor.

## Getting Started

### Prerequisites

-   Node.js (v18+)
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

For more details, see [doc/ARCHITECTURE.md](doc/ARCHITECTURE.md).

## Roadmap

See [doc/ROADMAP.md](doc/ROADMAP.md) for planned features and milestones.

## License

MIT
