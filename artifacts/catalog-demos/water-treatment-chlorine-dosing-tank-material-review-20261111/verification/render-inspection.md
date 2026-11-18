# Render inspection

- `npx tsx scripts/renderCatalogPreviews.ts chlorine-dosing-skid` generated the checked-in software-rendered PNG at 188 triangles.
- I opened the generated after-preview directly. The tank is a pale cool gray-blue and clearly separates from the teal pump/control body; the tray and tube rack remain gray. The silhouette and camera composition match the before-preview.
- Existing Chrome processes were present, but `http://127.0.0.1:9222/json/version` refused the connection. No replacement browser or attachment helper was launched. The already-rendered catalog PNG and decoded MP4 frames are the visual evidence for this check.
