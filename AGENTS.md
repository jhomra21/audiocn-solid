Do not make baseless or empty assumptions. Never say if this works like 'x' or 'y'. Always read source code or up to date docs.
Codebases will outlive us. Every shortcut becomes someone else's burden. Every hack compounds into technical debt that slows the whole team down. 
You are not just writing code, you are shaping the future of this project. The patterns you establish will be copied. The corners you cut will be cut again.

Fight entropy. Leave the codebase better than you found it.
Do not write plausible code, write accurate code backed by the reality of a codebase

Think carefully and only action the specific task I have given you with the most concise and elegant solution that takes into consideration existing code across codebase.
Prefer the most concise and elegant solutions that changes or adds as little code as possible.
Review your implementations before stopping. Check whether there is a better or simpler approach, whether any redundant code remains, whether duplicate logic was introduced, and whether any dead or unused code was left behind. If you find issues, fix them now; if not, briefly confirm the implementation is clean.
## Reference codebases

Use these projects to understand patterns and tradeoffs, not as templates to copy.

### OpenCode v2

**Repository:** `anomalyco/opencode`

Reference for package/domain ownership, Solid application structure, service boundaries, persistence, command/action design, and keeping UI state separate from lower-level runtime services.

### Pi

**Repository:** `earendil-works/pi`

Reference for narrow interfaces, small composable building blocks, direct code, package boundaries, and avoiding unnecessary abstraction.

### Diffusion Studio

**Repository:** `diffusionstudio/editor`, plus authorized `monorepo-new` when available.

Reference for editor architecture, media/application boundaries, worker/background processing, and larger product organization.

### DialKit

**Repository:** `joshpuckett/dialkit`

Reference for fine-grained interactive controls, parameter editing, reactive UI APIs, and small composable building blocks.

### Solid Primitives

**Repository:** `solidjs-community/solid-primitives`

Reference for Solid API design, browser behavior, storage/persistence, lifecycle/cleanup, and package-local ownership.

### OpenTUI

**Repository:** `anomalyco/opentui`

Reference for explicit command/result contracts, keyboard and interaction ownership, renderer/core separation, package-facing API surfaces, and cleanup-aware interactive systems.

### DAW Browser Convex

**Repository:** `jhomra21/daw-browser-convex`

Reference for browser/runtime boundaries, worker architecture, performance-sensitive state, and editor-style interaction systems.

## Engineering review skills

For broad API, architecture, or refactoring work, use the relevant engineering skills from `mattpocock/skills` as review lenses rather than as templates. In particular:

- `codebase-design` and `improve-codebase-architecture` for ownership, module depth, and dependency direction;
- `code-review` for correctness and regression review;
- `wayfinder` before changing unfamiliar subsystems;
- `tdd` / `implement` when behavior is best driven from a focused contract.

Prefer the smallest subset that materially improves the task.

## Reference policy

When designing a subsystem:

1. find the closest analogous boundary in the references;
2. understand why that boundary exists;
3. adopt only the smallest part that solves this repository's problem;
4. prefer fewer concepts, explicit ownership, type safety, and easy testing;
5. do not copy code or architecture blindly;
6. benchmark performance-sensitive designs instead of inferring performance from structure.
