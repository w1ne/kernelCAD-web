// scripts/lib/memorableBuildsCatalog.ts
//
// Machine-readable mirror of §2 of
// memorable-builds-policy spec (in kernelCAD-private).
//
// When the spec catalog is amended, update this file in the same commit.
// The denylist below is intentionally extensible — add primitive names
// that should never be valid `heroArtifact` slugs.

export interface CatalogCandidate {
  slug: string;
  recommended: boolean;
}

export interface CatalogEntry {
  version: CatalogVersion;
  candidates: CatalogCandidate[];
}

// Pre-policy iteration versions that were already shipped before this policy
// landed. Their legacy fields (gitSha/capturedAt/taskId) still get checked,
// but heroArtifact/catalogSource/overrideApprovedBy + catalog match are
// skipped per §1 non-goals of the memorable-builds policy spec.
export const GRANDFATHERED_VERSIONS = new Set<string>(['v0.1', 'v0.2']);

export const ALL_VERSIONS = [
  'v0.21',
  'v0.3', 'v0.4', 'v0.5', 'v0.6', 'v0.7', 'v0.8', 'v0.9',
  'v0.10', 'v0.11', 'v0.12', 'v0.13', 'v0.14', 'v0.15', 'v0.16', 'v0.17',
  'v1.0',
] as const;

export type CatalogVersion = (typeof ALL_VERSIONS)[number];

const CATALOG: Record<CatalogVersion, CatalogCandidate[]> = {
  'v0.21': [
    { slug: 'donut', recommended: true },
    { slug: 'apple-core', recommended: false },
    { slug: 'rubber-duck-silhouette', recommended: false },
  ],
  'v0.3': [
    { slug: 'service-panel-plate', recommended: true },
    { slug: 'espresso-cup', recommended: false },
    { slug: 'tiny-pumpkin', recommended: false },
    { slug: 'watering-can', recommended: false },
  ],
  'v0.4': [
    { slug: 'guitar-pick', recommended: true },
    { slug: 'house-key-silhouette', recommended: false },
    { slug: 'heart', recommended: false },
  ],
  'v0.5': [
    { slug: 'parametric-mug', recommended: true },
    { slug: 'parametric-lego-brick', recommended: false },
    { slug: 'parametric-phone-case', recommended: false },
  ],
  'v0.6': [
    { slug: 'articulated-desk-lamp', recommended: true },
    { slug: 'crank-slider-piston', recommended: false },
    { slug: 'robot-finger', recommended: false },
  ],
  'v0.7': [
    { slug: 'computer-mouse-shell', recommended: true },
    { slug: 'electric-guitar-body', recommended: false },
    { slug: 'perfume-bottle', recommended: false },
  ],
  'v0.8': [
    { slug: 'three-leg-stool-with-assembly-diagram', recommended: true },
    { slug: 'mini-drone-frame', recommended: false },
    { slug: 'skateboard-truck', recommended: false },
  ],
  'v0.9': [
    { slug: 'mechanical-keyboard-chassis', recommended: true },
    { slug: 'warp-pipe', recommended: false },
    { slug: 'rube-goldberg-gear-train', recommended: false },
  ],
  'v0.10': [
    { slug: 'engine-block-exploded-view', recommended: true },
    { slug: 'nesting-doll-cross-section', recommended: false },
    { slug: 'onion-cross-section', recommended: false },
  ],
  'v0.11': [
    { slug: 'kernelcad-logo-extruded', recommended: true },
    { slug: 'hello-world-3d-text', recommended: false },
    { slug: 'engraved-postcard', recommended: false },
  ],
  'v0.12': [
    { slug: 'rubber-duck-skill', recommended: true },
    { slug: 'self-bundling-build', recommended: false },
  ],
  'v0.13': [
    { slug: 'origami-crane-in-steel', recommended: true },
    { slug: 'pencil-cup', recommended: false },
    { slug: 'letter-holder', recommended: false },
  ],
  'v0.14': [
    { slug: 'octopus', recommended: true },
    { slug: 'gyroid-lattice-cube', recommended: false },
    { slug: 'coral-cluster', recommended: false },
  ],
  'v0.15': [
    { slug: 'tiny-wooden-chair', recommended: true },
    { slug: 'picture-frame', recommended: false },
    { slug: 'birdhouse', recommended: false },
  ],
  'v0.16': [
    { slug: 'napkin-sketch-to-3d', recommended: true },
    { slug: 'whiteboard-sketch-to-3d', recommended: false },
    { slug: 'photo-of-flat-object-to-3d', recommended: false },
  ],
  'v0.17': [
    { slug: 'engraved-nameplate', recommended: true },
    { slug: 'engraved-coaster', recommended: false },
    { slug: 'cookie-cutter-shape', recommended: false },
  ],
  'v1.0': [
    { slug: 'mechanical-music-box', recommended: true },
    { slug: 'articulated-robot-arm', recommended: false },
    { slug: 'pinball-machine-table', recommended: false },
  ],
};

export const GENERIC_PRIMITIVE_DENYLIST = new Set<string>([
  'box',
  'bracket',
  'plate',
  'cylinder',
  'cube',
  'sphere',
  'torus-only',
]);

export function getCatalogForVersion(version: string): CatalogEntry | undefined {
  if (!(ALL_VERSIONS as readonly string[]).includes(version)) return undefined;
  return { version, candidates: CATALOG[version as CatalogVersion] };
}

export function isCatalogSlug(slug: string, version: string): boolean {
  const entry = getCatalogForVersion(version);
  if (!entry) return false;
  return entry.candidates.some((c) => c.slug === slug);
}
