# Assembly path implementation plan
Implement inline under the user's autonomous authorization.
1. Write focused failing mesh tests: blind pocket, captured part, thin obstacle, arbitrary direction, containment, validation and greedy order.
2. Implement continuous triangle sweep and checker in modeling/runtime using DfmMesh/MeshBvh. Reuse scene transformation and export meshing in a scene adapter.
3. Add the script MCP wrapper and verify routing/schema. Refresh public contract and schema revision as required. Test real script evaluation and routing.
4. Update guide and skill discovery. Produce an MP4 of actual checker results, retain source/settings/evidence, inspect frames.
5. Run relevant typechecks, changed-file ESLint, checker/registry/contract suites. Review diff, conventional commit, push only feat/check-assembly-path. No deployment or PR.
