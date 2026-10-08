# Handoff: release candidate

## Checkpoint

- Repository: `https://github.com/jhomra21/audiocn-solid.git`
- Branch: `feat/solid2-site-spikes`. Use `git rev-parse HEAD` for the current checkpoint.
- Upstream reference: `audiocn/ui@4234aa114b8696e2704db7825c1289cf74d1e4f2`, including the current Knob circular hit-area fix.
- Nothing has been merged, tagged, published to the shadcn Registry Directory, or deployed to Cloudflare yet.

## Release contents

- Shared Solid 1 and Solid 2 component and hook source.
- 23 public UI components, 18 hooks, six blocks, and the framework-neutral audio core.
- 65 registry entries per runtime. Each item installs copied source, declared dependencies, compatibility files, and license notices.
- Static Solid 2 documentation with 55 docs pages, 57 public routes, search, examples, contributors, themes, source previews, Markdown endpoints, `llms.txt`, `llms-full.txt`, AI copy actions, SEO metadata, and social cards.
- Hosted registries are generated at `/r/solid1` and `/r/solid2`.
- `mixer` installs `channel-strip`, matching upstream's documented composition.
- Cloudflare static Worker configuration lives in `wrangler.jsonc`.
- `siteConfig.url` reads `VITE_AUDIOCN_SITE_URL` at build time so canonical URLs, registry links, AI prompts, robots, sitemap entries, and social metadata use the deployed host.

## Repository rules

Read `AGENTS.md` and `README.md` before changing code.

Keep public components in `components/ui`, blocks in `components/blocks`, examples in `components/examples`, lifecycle integrations in `hooks`, framework-neutral audio code in `lib/audio`, and Solid compatibility code in `lib/solid`. Do not add barrel files or a `packages/` monorepo without a real runtime or distribution boundary.

The frozen dependency lanes are:

- root Solid `1.9.15` (manifest range `^1.9.15`)
- site Solid and web `2.0.0-rc.13`
- Solid Vite plugin `3.0.0-next.47`
- Kobalte `0.13.14` for Solid 1
- Kobalte `2.0.0-alpha.2` for Solid 2
- root Vite `7.3.6` and site Vite `8.3.2` (manifest ranges `^7.3.6` and `^8.0.0`)

These are lockfile resolutions; use `bun install --frozen-lockfile` for reproducible validation. Solid 2 and Kobalte 2 remain prerelease dependencies.

## Local validation

Use Bun `1.4.2`.

```sh
bun install --frozen-lockfile
bun run format:check
bun run lint
bun run check
bun run test:unit
cd site
bun run typecheck
bun run test:unit
bun run build:release
bunx playwright test --config playwright.home-routing.config.ts
bunx playwright test --config playwright.release.config.ts
cd ..

bun run registry:validate-shadcn
bun run registry:build
bun run registry:test-install
bun run registry:test-contracts
bun run registry:test-release
```

The CI workflow additionally runs both runtime browser suites and the isolated registry install suite. Run Solid 2 acceptance in an owned checkout/worktree: its package swap changes `node_modules` and must not race with root Solid 1 development or checks. Use the frozen install before applying the pinned Solid 2 package override; do not swap and restore packages in a shared working checkout.

The production preview suite owns port `4180`. The isolated site runner owns port `4400`. The dedicated home-audio routing suite owns port `4398`.

Run `bun run registry:test-contracts` after the real isolated installs above. Keep the generated consumer fixtures while rerunning contracts; reports pointing to deleted fixtures must be regenerated. Run `bun run registry:test-release` for a clean frozen release build. Run `bun run registry:spike:3` for those installs plus all installed-control and block acceptance checks.

Live upstream presentation parity is separate from the staging release gate. To rerun it, provide a checkout or export of upstream `content/docs` at the pinned revision and run:

```sh
AUDIOCN_UPSTREAM_SOURCE=/path/to/audiocn-ui bun run parity
```

Do not hide upstream drift behind broad parity exemptions.

## Cloudflare staging

Follow the exact dashboard and command settings in the README.

The Cloudflare Worker name must be `audiocn-solid` so it matches `wrangler.jsonc`. Build with the real assigned `workers.dev` origin in `VITE_AUDIOCN_SITE_URL`, then deploy `site/dist/client`.

From the repository root, use `bun run build:web` to build the site and `bunx wrangler deploy` to deploy it. Wrangler is not pinned in this repository.

After deployment, run:

```sh
AUDIOCN_SITE_URL=https://audiocn-solid.<workers-subdomain>.workers.dev \
  bun run --cwd site host:check

AUDIOCN_REGISTRY_ORIGIN=https://audiocn-solid.<workers-subdomain>.workers.dev \
  bun run registry:test-install
```

The first command requires an HTTPS origin and checks all 57 sitemap routes and their canonical/social cards, all 55 Markdown endpoints and MIME headers, the search payload format and 55-document count, robots/LLM resources, both 65-item registry inventories and item identities, the Mixer dependency, the brand SVG, and HTTP 404 behavior. It permits one expected same-origin trailing-slash redirect for HTML routes only and bounds requests and response bodies to 10 seconds. This is an HTTP/static release check, not a browser-hydration check or proof of search document identities or every script/CSS asset. The second command creates fresh Solid 1 and Solid 2 consumers and installs every registry item through the public HTTPS endpoint before typechecking and building each install.

## shadcn Registry Directory

Do not submit the directory entry until the deployed Worker passes both hosted checks.

The public namespace is `@audiocn-solid`. The directory supports one URL template per namespace, so the directory entry points to the stable Solid 1 endpoint:

```text
https://<worker-host>/r/solid1/{name}.json
```

Solid 2 remains available through the explicit `/r/solid2/{name}.json` registry configured in the consumer's `components.json`.

The README contains the exact `apps/v4/registry/directory.json` entry and validation steps for a shadcn/ui pull request. Staging is not publication: the hosted checks, final-commit CI, explicit release decision, and public directory submission remain separate gates. The unversioned registry URLs serve whichever source revision is currently deployed; downstream consumers own their copied source and review updates themselves.

After shadcn merges that pull request, create a fresh Solid 1 app with no custom `@audiocn-solid` registry entry and verify that the directory resolves and installs at least `level-meter`, `mixer`, and `system-audio-mixer`. Typecheck, build, and run a browser smoke test against the installed components.

## Limits before public release

- Physical microphone and system-audio capture still need real hardware/browser permission testing.
- Haptics need device testing.
- iOS behavior still needs physical iPhone or iPad testing.
- Three upstream React Activity lifecycle cases have no exact Solid lifecycle equivalent: retained-player pause without reload, capture returning idle after retained hide/show, and retained graph disconnect/reconnect.
- Live upstream parity can change independently of this repository and should not block a staging build unless it identifies a real port difference.
