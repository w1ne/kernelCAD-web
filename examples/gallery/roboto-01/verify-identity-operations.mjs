const TEMPLATE_TICK = String.fromCharCode(96);
const EXPECTED_LOAD_LINK =
  'const loadLink = async (name: string) => (await lib.meshFromSTL(' +
  TEMPLATE_TICK +
  './roboto-01/meshes/$' +
  '{name}.STL' +
  TEMPLATE_TICK +
  ')) .scale(1000) .material({ baseColor: paintFor(name), metalness: 0.05, roughness: 0.75 });';

const EXPECTED_LOAD_LINK_USES = [
  "base_link: rp1.part('base_link', await loadLink('base_link')),",
  'refs[j.child] = rp1.part(j.child, await loadLink(j.child));',
];

function normalizeWhitespace(source) {
  return source.replace(/\s+/g, ' ').trim();
}

export function findGeometryOperationIssues(source) {
  const issues = [];
  const start = source.indexOf('const loadLink');
  const end = source.indexOf('const refs', start);
  if (start < 0 || end < 0) {
    return ['could not locate the loadLink definition and part use sites'];
  }

  const loadLink = normalizeWhitespace(source.slice(start, end));
  if (loadLink !== normalizeWhitespace(EXPECTED_LOAD_LINK)) {
    issues.push('loadLink must match the approved STL load, unit scale, and PBR finish chain');
  }

  const normalizedSource = normalizeWhitespace(source);
  for (const expectedUse of EXPECTED_LOAD_LINK_USES) {
    if (!normalizedSource.includes(normalizeWhitespace(expectedUse))) {
      issues.push('loaded meshes must pass directly to their expected assembly part');
      break;
    }
  }

  const loadCalls = [...source.matchAll(/\bloadLink\s*\(/g)];
  if (loadCalls.length !== 2) {
    issues.push(`expected exactly two direct loadLink calls, found ${loadCalls.length}`);
  }
  return issues;
}
