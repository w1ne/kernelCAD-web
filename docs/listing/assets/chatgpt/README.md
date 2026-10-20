# ChatGPT listing screenshots

Captured in a signed-in ChatGPT session with the kernelCAD app (developer-mode connector) on 2026-10-19/20, at the prompts below. These are the images for the plugin-directory submission; the demo recording is still to be captured.

| File | Prompt | What it shows |
|---|---|---|
| `01-plate-viewer.png` | Design a 60 × 40 × 5 mm mounting plate with four M4 clearance holes 5 mm from the corners. | In-chat 3D viewer with the plate and its four holes |
| `02-dfm-checklist.png` | Is it printable on a Bambu A1 mini? Check it for CNC too. | DFM/CNC result table and the machining conclusions |
| `03-step-drawing.png` | Give me a STEP file and a PDF drawing. | STEP + PDF drawing reply, with the drawing attachment |
| `04-step-import.png` | Import this STEP file and add a 10 mm hole through the middle: `…/Moving_Jaw.step` | Imported STEP edited with a Ø10 through-hole, opened in the 3D viewer |

The import case used a public STEP URL (`examples/robot-arm/so100/parts/Moving_Jaw.step` on the `develop` branch) so the same flow can be repeated without a local file. Keep the prompts and the capture date with the files when they are replaced.
