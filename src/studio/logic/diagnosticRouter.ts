import type { ValidatorDiagnostic } from '../../lib/mates/validator';
import type { SelectedFeatureId } from '../types';

/**
 * Map a validator diagnostic to the selection target the tri-pane sync
 * should jump to.
 *
 * Precedence: `partName` > `mateName` > `partA` (for interference pairs;
 * `partB` is the other end and isn't the "primary" subject) > `null`.
 *
 * Returning `null` is valid — some kernel-level diagnostics don't bind to a
 * single feature. The Drawer row stays inert; SceneTab/CodeTab/Viewport
 * don't react.
 */
export function routeDiagnosticToSelection(diagnostic: ValidatorDiagnostic): SelectedFeatureId {
    if (diagnostic.partName) return diagnostic.partName;
    if (diagnostic.mateName) return diagnostic.mateName;
    if (diagnostic.partA) return diagnostic.partA;
    return null;
}
