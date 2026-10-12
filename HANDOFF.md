# Project handoff

The current development and release instructions live in [`DEVELOPMENT.md`](./DEVELOPMENT.md). Read that file and [`AGENTS.md`](./AGENTS.md) before starting implementation or release work.

## Click-sound follow-up

- Upstream baseline: `audiocn/ui@4234aa114b8696e2704db7825c1289cf74d1e4f2`.
- Adopted, unmerged click-sound PR #19 head: `d4f23c6e880661163b4b471cf3559f9caf62d448`.
- Outstanding React Activity parity cases: pause a retained player without reload; return capture to idle after retained hide/show; disconnect and reconnect a retained graph.

## Current state

- `origin/main` is the source baseline. Check `git status` and `git rev-parse HEAD` for the current checkout and local changes.
- The repository contains the shared Solid 1/Solid 2 component and hook source, a Solid 2 docs site, and generated Solid 1 and Solid 2 shadcn registries.
- Registry Directory PR #12221 is ready for maintainer review and remains unmerged. Check its live state before relying on that status.
- Solid 2 and its Kobalte fork remain prerelease dependencies. The Kobalte archives and provenance are documented in [`patches/README.md`](./patches/README.md).
- No npm component package is published. Distribution uses copied source from the shadcn registries.

## Before release

Follow the local checks and hosted validation in [`DEVELOPMENT.md`](./DEVELOPMENT.md). The release gate includes both runtime browser suites, clean registry installs, the site release build, hosted route checks and fresh consumer installs. Physical iOS playback and capture still need device testing.

Do not deploy, publish a directory entry, tag, or announce a release without an explicit release decision.
