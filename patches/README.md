# Published AudioCN fork dependencies

AudioCN consumes reviewed, immutable assets from public prereleases on AudioCN-owned forks. They are not upstream releases, are not published to npm, and are not endorsed by the upstream projects. Package URLs and exact versions are recorded in the root `package.json` and Solid 2 registry generator.

## Kobalte Solid 1

- Source: [`jhomra21/kobalte@e0e3bf095f05c7e61230a251b79181c6d834d408`](https://github.com/jhomra21/kobalte/tree/e0e3bf095f05c7e61230a251b79181c6d834d408)
- Release: [`kobalte-solid1-audiocn-e0e3bf095f05c7e61230a251b79181c6d834d408`](https://github.com/jhomra21/kobalte/releases/tag/kobalte-solid1-audiocn-e0e3bf095f05c7e61230a251b79181c6d834d408)
- Package: `@kobalte/core@0.13.14-audiocn.0.e0e3bf09`
- SHA-256: `32058fb0367a09187555e1d3a17e52a59162b9639440ba4592a4169d741f2e54`
- Archive license: MIT.

## Kobalte Solid 2

- Source: [`jhomra21/kobalte@9f7acab017f2ba4b347ce0efd325c5eb1e6f9f4c`](https://github.com/jhomra21/kobalte/tree/9f7acab017f2ba4b347ce0efd325c5eb1e6f9f4c) (branch `fix/completed-touch-dismissal-solid2-alpha5`), based on upstream `@kobalte/core@2.0.0-alpha.5` (`e336494b8c2cffa4862eaac1673f54e133338d4e`)
- Release: [`kobalte-solid2-audiocn-9f7acab017f2ba4b347ce0efd325c5eb1e6f9f4c-alpha5.1`](https://github.com/jhomra21/kobalte/releases/tag/kobalte-solid2-audiocn-9f7acab017f2ba4b347ce0efd325c5eb1e6f9f4c-alpha5.1)
- Package: `@kobalte/core@2.0.0-alpha.5-audiocn.1.9f7acab0`
- SHA-256: `b3a88fec239fc2f5fa0cf1da33cfebf6841c937f168bb46c38b639a4c3c80a94`
- Peers: `solid-js@^2.0.0` and `@solidjs/web@^2.0.0` (tested against 2.0.3).
- Bundled helper: `@solid-primitives/interaction@1.0.0-audiocn.1.94f99cb8` from [`jhomra21/solid-primitives@94f99cb8afd1b98cad4e0a96d7ad94fcea4dead2`](https://github.com/jhomra21/solid-primitives/tree/94f99cb8afd1b98cad4e0a96d7ad94fcea4dead2) (branch `fix/touch-outside-completion-1.0`, based on upstream interaction 1.0.0). Its license notice is in the archive.

All other dependencies, including `@solid-primitives/utils` and `@kobalte/utils`, are normal npm registry dependencies; the manifest has no URL dependencies or consumer overrides. The fork adds one commit to upstream Kobalte: completed outside-touch dismissal for Solid 2 (`captureTouchOutside` and a layer-stack generation check), which the patched interaction package consumes. Upstream alpha.5 does not contain this fix, so the fork stays until an upstream release includes it.

The prerelease packages contain the outside-touch completion fixes used by this repository. They do not establish upstream adoption, physical Safari behavior, or server-side rendering support. Raw Node import of Kobalte Popover remains unsupported; the AudioCN site is separately validated through its actual Vite SSR and release-route guard.
