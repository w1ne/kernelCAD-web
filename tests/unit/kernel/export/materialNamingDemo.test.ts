import { expect, it } from 'vitest';
import { createDemoArtifacts } from '../../../../docs/demos/pr1-named-gltf-materials/demo';

it('exports and verifies the named-material demo GLB', async () => {
  expect(await createDemoArtifacts({ write: false })).toEqual(['brass', 'hull']);
});
