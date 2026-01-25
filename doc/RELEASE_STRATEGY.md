# Release Strategy

We use **Continuous Deployment** via GitHub Actions.

## Automated Deployment
Deployment to GitHub Pages is fully automated and triggered by Git tags.

### Release Process (Automated)

We provide a helper script to automate the release process (lint, build, tag, push).

```bash
# Release a patch version (e.g. 0.0.1 -> 0.0.2)
npm run release patch

# Release a minor version (e.g. 0.1.0 -> 0.2.0)
npm run release minor
## Release Process
1.  **Update Documentation**: Ensure `CHANGELOG.md`, `README.md`, and `doc/` files reflect the new changes.
2.  **Run Release Script**:
    ```bash
    npm run release <type>
    # type: patch, minor, or major
    ```
3.  **CI/CD**: The script pushes the tag, triggering the GitHub Action to deploy.

### Release Pipeline (`.github/workflows/deploy.yml`)
1.  **Trigger**: `on: push: tags: - 'v*'`
2.  **Build**:
    -   Sets up Node.js.
    -   Installs dependencies (`npm ci`).
    -   Builds the project (`npm run build`).
    -   Produces artifacts in `dist/`.
3.  **Deploy**:
    -   Uses `actions/deploy-pages`.
    -   Updates the `gh-pages` environment.

## Manual Verification
After the workflow completes, verify the deployment at:
`https://<username>.github.io/kernelCAD/`

## Configuration Notes
-   **Vite Base Path**: `vite.config.ts` must have `base: "./"` to support subpath hosting on GitHub Pages.
-   **WASM Assets**: `public/opencascade.wasm` must be present for production builds, as the dynamic import from `node_modules` is flaky in some bundler environments.
