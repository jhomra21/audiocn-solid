# Published AudioCN fork dependencies

AudioCN consumes reviewed, immutable assets from public prereleases on AudioCN-owned forks. They are not upstream releases, are not published to npm, and are not endorsed by the upstream projects. Package URLs and exact versions are recorded in the root `package.json` and Solid 2 registry generator.

## Kobalte Solid 1

- Source: [`jhomra21/kobalte@e0e3bf095f05c7e61230a251b79181c6d834d408`](https://github.com/jhomra21/kobalte/tree/e0e3bf095f05c7e61230a251b79181c6d834d408)
- Release: [`kobalte-solid1-audiocn-e0e3bf095f05c7e61230a251b79181c6d834d408`](https://github.com/jhomra21/kobalte/releases/tag/kobalte-solid1-audiocn-e0e3bf095f05c7e61230a251b79181c6d834d408)
- Package: `@kobalte/core@0.13.14-audiocn.0.e0e3bf09`
- SHA-256: `32058fb0367a09187555e1d3a17e52a59162b9639440ba4592a4169d741f2e54`
- Archive license: MIT.

## Bundled Kobalte Solid 2

- Source: [`jhomra21/kobalte@b394be557e697ad4d3c28210df8a75aa3c300914`](https://github.com/jhomra21/kobalte/tree/b394be557e697ad4d3c28210df8a75aa3c300914)
- Release: [`kobalte-solid2-audiocn-b394be557e697ad4d3c28210df8a75aa3c300914-bundled.1`](https://github.com/jhomra21/kobalte/releases/tag/kobalte-solid2-audiocn-b394be557e697ad4d3c28210df8a75aa3c300914-bundled.1)
- Package: `@kobalte/core@2.0.0-alpha.2-audiocn.2.b394be55`
- SHA-256: `ff724287fa858fcb221354ecc71fa7ecdbca7934a9d0eee7080ef0a59fe035b0`
- Archive includes Kobalte's Apache-2.0 license and MIT attribution notices for bundled code.

The Solid 2 package bundles the required Solid Primitives and Kobalte utility code; it has no transitive release-URL dependencies or consumer overrides. Its peers are `solid-js@2.0.0-rc.14` and `@solidjs/web@2.0.0-rc.14`.

The prerelease packages contain the outside-touch completion fixes used by this repository. They do not establish upstream adoption, physical Safari behavior, or server-side rendering support. Raw Node import of Kobalte Popover remains unsupported; the AudioCN site is separately validated through its actual Vite SSR and release-route guard.
