# Selected web asset builds

Gallery entries may explicitly set `previewMesh: { tolerance: 2.5,
angularTolerance: 0.85 }`, `meshopt: true`, and `compactBridge: true`. Deflection
uses millimetres and radians. Both values must be finite and positive. The
preview meshes every physical part of the freshly built SceneBackend, clears
cached OCCT triangulations, and bakes each world transform. Names, normals and
per-part materials survive. Missing parts/faces fail; synthetic tendon assemblies
are explicitly unsupported by this preview path. `previewMesh` cannot accompany
`modelLocal`. A selected entry may also set `modelOrientation` to exactly three
finite degree angles in model-viewer's roll/pitch/yaw order. For native Z-up to
viewer Y-up, `0deg -90deg 0deg` applies the existing viewer orientation attribute;
it changes only that selected viewing pose. Omitted options retain the existing native export and optimizer
flags. Studio and fabrication defaults do not change.

A blog post may set `modelCompression: meshopt` with its `model` path. The post
keeps the full native fine mesh. Coordinate conversion runs before packing. The
final packed file must remain below 2,000,000 bytes; a gallery file must remain
below 600,000 bytes. These limits have not been raised.

Packing manually attaches the supported `EXT_meshopt_compression` extension to
original buffers with its `QUANTIZE` encoder mode. There is no `quantize`, reorder,
filter or simplification transform in the packing helper. The encoder mode name
does not mean a quantization transform was applied. Decoded Float32 attributes
retain every bit; the TRIANGLES codec can cyclically rotate index triplets while
preserving every oriented triangle and winding. Index bytes are not identical.
Known glTF extensions are registered, including PBR material extensions. An
unknown extension fails before the opt-in optimizer or converter can
silently discard it.

Only pages selecting compressed assets configure model-viewer's
`meshoptDecoderLocation`, before module initialization. The classic installed
meshoptimizer decoder and its MIT license are copied to same-origin
`/vendor/meshopt/`; its WASM is embedded. No new decoder CDN or separate WASM file
is required. A gallery manifest configures the decoder before creating any tile
or importing model-viewer. Plain callers also read compressed files when counting
materials/colours.

Bridge compaction is build-only and restricted to serialized `faces[].vertices`,
`normals`, optional `uv`, and `edges`. Short decimal candidates with one through
nine significant digits must round-trip to exactly the original Float32 value.
Indices and all double precision metadata (including volume, transforms, planes,
cylinders, materials, source, records, parameters, review and bounds) are retained.
Nonfinite mesh-buffer values fail. Signed zero is explicitly normalized to +0,
matching the existing JSON encoding boundary: bit identity is against the
existing JSON round-trip baseline, not raw pre-JSON signed-zero bits. Inputs are
not mutated. The complete UTF-8 payload is checked against 25 MiB before writing.
A selected compact bridge checks current lowered native owners against every
declared part and native face ID, with nonempty triangle buffers. Construction
inputs, suppressed and virtual records are excluded using current source ownership;
unrelated cached or session assemblies do not supply completeness evidence.
Active assemblies with synthetic tendons are explicitly unsupported.
A selected compact bridge fails on missing/partial geometry, precompute/review failure,
or excess size; other entries retain the original nonfatal precompute fallback.
Actual structural warnings are preserved.

For isolated verification, pass an absolute single-entry temporary manifest and
scratch `publicDir` to `buildGallery`. The builder wipes its `gallery` output:
never point a scratch experiment at the full site's existing output. Publication
entries, guide content, deployment and browser acceptance are separate tasks.
