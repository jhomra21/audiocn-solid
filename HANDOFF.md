# Project handoff

The current development and release instructions live in [`DEVELOPMENT.md`](./DEVELOPMENT.md). Read that file and [`AGENTS.md`](./AGENTS.md) before starting implementation or release work.

## Click-sound follow-up

- Upstream baseline: `audiocn/ui@6689aa009f39a591523faa5b24673e2be75fcb72`.
- Click-sound PR #19 merged upstream as `95e7510`; the local implementation was already ported from its PR head.
- Outstanding React Activity parity cases: pause a retained player without reload; return capture to idle after retained hide/show; disconnect and reconnect a retained graph.

## Unmerged upstream PRs adopted

These open `audiocn/ui` PRs are ported ahead of upstream. The baseline above is unchanged. Check each PR's live state, and re-port any change before it merges.

- LCD VU Meter, PR #28, head `05a7e9a3347b90a6d7ace1144d96d27eeb5ce6de`.
- LCD Spectrum, PR #29, head `bc57875c69e36caf25470346153b05ef300ce0c7`.
- LCD Number Field, PR #30, head `7d065ea729f1e3b2273f98fd70d9388a051850ab`. It is native here, since Kobalte has no number field.

## Current state

- `origin/main` is the source baseline. Check `git status` and `git rev-parse HEAD` for the current checkout and local changes.
- The repository contains the shared Solid 1/Solid 2 component and hook source, a Solid 2 docs site, and generated Solid 1 and Solid 2 shadcn registries.
- Registry Directory PR #12221 is ready for maintainer review and remains unmerged. Check its live state before relying on that status.
- Solid 2 is stable (2.0.3), but its Kobalte fork remains a prerelease dependency. The Kobalte archives and provenance are documented in [`patches/README.md`](./patches/README.md).
- No npm component package is published. Distribution uses copied source from the shadcn registries.

## Before release

Follow the local checks and hosted validation in [`DEVELOPMENT.md`](./DEVELOPMENT.md). The release gate includes both runtime browser suites, clean registry installs, the site release build, hosted route checks and fresh consumer installs. Physical iOS playback and capture still need device testing.

Do not deploy, publish a directory entry, tag, or announce a release without an explicit release decision.
