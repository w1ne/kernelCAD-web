# kernelCAD authoring reference — Materials and reference images

Finishes, raw PBR, per-face materials, and reference-image overlays.

## Materials

There are three ways to set surface character. Reach for them in this order:

1. **`.color(token | '#hex')`** — HUE ONLY. Cheapest. Role tokens (servo, gear,
   beam, shaft, plate, pin, frame, tool) or a literal hex. Right for schematic
   assembly renders where photo-accuracy is not the point.
2. **`.finish(name, { color? })`** — a NAMED material finish: hue plus surface
   character (metalness / roughness / clearcoat). This is the primary verb when
   you know the material. You name "brass" or "matte ABS", not BRDF floats.
3. **`.material({...})`** — the raw-PBR escape hatch. Only for glass, clearcoat,
   anisotropy, or image textures that no finish token covers (see below).

**How they compose on one leaf:** a `.finish()`/`.material()` PBR record
overrides a `.color()` hue at render time. `.finish()` and `.material()` write
the same slot, so on one leaf it is last-write-wins between them. To TINT a
finish, pass `{ color }` to `.finish()` — do not layer `.color()` under it, the
hue would be shadowed.

**Critical rule:** apply `.finish()` / `.material()` to leaf parts BEFORE they
enter a boolean. A call on a post-union root is a no-op — the kernel cannot
retroactively assign material to the input leaves of a boolean.

### `.finish(name, opts?)` — named finishes

```typescript
bracket.finish('anodized-black');                 // matte black anodised alu
crownGear.finish('brass');                        // brass, intrinsic colour
housing.finish('abs', { color: '#c0392b' });      // red ABS housing
knob.finish('paint-gloss', { color: '#0a3d62' }); // glossy navy paint
lens.finish('glass-tinted');                       // real refraction, no floats
bezel.finish('brass', { face: 'ring' });           // per-face, like .material({ face })
```

The vocabulary (small and curated — pick the closest, override the hue if you
need a different colour). This table is the source the finish-drift gate checks
against `FINISH_TOKENS`; keep the two in sync.

<!-- FINISH-VOCABULARY:START -->
| group | finishes |
|---|---|
| metals | `aluminium`, `aluminium-brushed`, `anodized-black`, `anodized`, `steel`, `stainless`, `brass`, `copper`, `titanium` |
| plastics | `abs`, `pla`, `nylon`, `delrin`, `polycarbonate`, `rubber`, `plastic-glossy` |
| glass | `glass`, `glass-tinted`, `acrylic` |
| paint / neutral | `paint-matte`, `paint-gloss`, `default` |
<!-- FINISH-VOCABULARY:END -->


`opts.color` overrides the hue while keeping the finish. It is meaningful for
the paints, `abs`, `plastic-glossy`, and `anodized` (dyed anodising); for raw
metals the colour is intrinsic, so an override is accepted but rarely wanted.
An unknown finish name throws `feature.finish.unknown-token` and lists the valid
finishes — it does not fall back to a default.

### Advanced: raw PBR via `.material()`

`Shape.material(opts)` is the escape hatch when no finish token fits — glass with
a specific attenuation, brushed anisotropy, a bespoke clearcoat, or image
textures. The fields are three.js `MeshPhysicalMaterial` floats; a finish token
expands to exactly this record, so anything a finish does, `.material()` can do
by hand. Prefer the named finish unless you need one of the fields below.

```typescript
// Bespoke glossy acetate — clearcoat + ior a finish token does not name exactly
part.material({
  baseColor: '#0a0a0a',
  metalness: 0.0,
  roughness: 0.15,
  clearcoat: 0.8,
  clearcoatRoughness: 0.05,
  ior: 1.55,
});
```

### Glass, brushed metal, textured surfaces

Three additional `PBRMaterial` fields cover the common photoreal archetypes:

**Glass (volume absorption).** `transmission > 0` is light passing through;
`thickness` (mm) and `attenuationColor` + `attenuationDistance` (mm) together
shade the colored absorption through the body. The renderer auto-loads a
neutral studio HDRI when any material in the scene has `transmission > 0`, so
glass renders with realistic refraction without needing `setRenderEnvironment`.

```typescript
// Dark sunglass lens
lens.material({
  baseColor: '#ffffff',
  transmission: 0.85,
  ior: 1.5,
  thickness: 3,
  attenuationColor: '#1a1a2a',
  attenuationDistance: 8,
  roughness: 0.0,
});
```

**Brushed / anisotropic metal.** `anisotropy` (0..1) stretches the specular
highlight; `anisotropyRotation` (degrees, normalized to [0,360)) aligns the
brush direction with a face axis.

```typescript
// Brushed aluminum hinge
hinge.material({
  baseColor: '#b0b0b0',
  metalness: 1.0,
  roughness: 0.3,
  anisotropy: 0.8,
  anisotropyRotation: 90,
});
```

**Image-texture maps.** `textures` attaches up to six maps — `albedo`,
`normal`, `roughness`, `metalness`, `anisotropy`, `emissive`. Paths resolve
relative to the script file (mirrors `referenceImage()`); `https://` URLs are
fetched once and sha256-cached at `~/.cache/kernelcad/textures/`.

```typescript
// Matte acetate frame with normal-mapped grain
frame.material({
  baseColor: '#1a1a1a',
  roughness: 0.55,
  textures: {
    albedo: { path: './acetate-color.png' },
    normal: { path: './acetate-normal.png' },
    roughness: { path: './acetate-rough.png' },
  },
});
```

Supported texture formats: `.png`, `.jpg`, `.jpeg`, `.webp`. Maximum dimension
8192px (hard error); textures over 2048px on the longest side surface a
console warning. Each `TextureRef` accepts optional `repeat: [u, v]`,
`offset: [u, v]`, and `rotation: <degrees>`.

**For reproducible hero builds:** download URL textures and check the files
into the script's directory before committing. Agent-fetched URLs land in
`~/.cache/kernelcad/textures/` but that cache is not source-controlled.

### Per-face materials

For parts where different faces need different materials (eyewear rim vs. lens
vs. temple-hinge boss; brushed body + polished crown; etc.), pass a `face`
field referencing a face label declared on a creating op:

```typescript
const frame = box(140, 50, 6, false, {
  faceLabels: { front: 'front', back: 'back', top: 'top' },
});
frame.material({ face: 'front', baseColor: '#0a0a0a', clearcoat: 1, roughness: 0.1 });  // glossy acetate front
frame.material({ face: 'back',  baseColor: '#1a1a1a', roughness: 0.7 });                // matte interior
frame.material({ baseColor: '#cccccc', roughness: 0.5 });                                // default for unlabeled faces
```

Rules:
- `face` must be a label declared upstream via the creator's `faceLabels` option
  (or via `path().label(...)` for sketch-derived shapes).
- Calls accumulate on the shape — multiple `.material({ face: ... })` calls
  build up per-face entries. A second call with the same `face` overwrites.
- A call **without** `face` sets the shape-level default (applies to any face
  not covered by a per-face entry).
- If a label fails to resolve at mesh time (typo, transform stripped lineage,
  no upstream `faceLabels` entry), the build continues and a soft
  `feature.material.face-label-no-match` warning is emitted; the affected faces
  fall back to the shape-level default.
- Per-face identity dies at boolean operations (same as `.color()` and the
  whole-shape `.material()`). Apply per-face materials AFTER all booleans.

## Reference images

`referenceImage(path, opts)` places a reference photo as a plane overlay in the
Studio viewport. Display only, and the
image is hidden during scoring (`--hide-reference-images`).

```typescript
// Front-view overlay (XZ plane) — typical for flat products facing the camera
referenceImage('./reference.jpg', {
  plane: 'xz',
  anchor: 'origin',
  scale: 'fit-bbox',   // auto-scales to match the model's bounding box
  opacity: 0.4,        // ghost behind the model; adjust to taste
});

// Top-down overlay (XY plane) — for PCBs, floor plans, plate layouts
referenceImage('./top-view.jpg', {
  plane: 'xy',
  anchor: 'origin',
  scale: 'fit-bbox',
  opacity: 0.3,
});

// Side overlay (YZ plane) — for profiles, silhouettes from the right
referenceImage('./side.png', {
  plane: 'yz',
  anchor: 'origin',
  scale: { width: 130 },   // explicit width in mm; height auto-computed
  opacity: 0.5,
  flipU: true,             // mirror horizontal if the reference is from the left
});
```

Multiple `referenceImage()` calls are allowed — one per view plane. Path is
resolved relative to the calling `.kcad.ts` file. Supported formats: `.png`,
`.jpg`, `.jpeg`, `.webp`. Validation errors (missing file, bad format, invalid
plane) are pushed as diagnostics on the returned handle rather than thrown.
