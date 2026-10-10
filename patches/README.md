# Outside-touch completion, local proof only

These Bun patches fix the proven dependency contract in this checkout. They are **not a portable registry release**. Fresh registry consumers do not inherit this repository's `patchedDependencies` or acceptance-harness aliases. No new dependency versions, upstream submissions, or publications are implied.

## Owners and scope

- `@solid-primitives/interaction@1.0.0-next.4`: complete the touch gesture in `makeInteractOutside`; clean up the previous attachment when its ref changes. Initialize the tracker after template adoption, when the original primitive resolves the live owner document.
- `@kobalte/core@0.13.14`: patch its bundled copy of the interaction primitive.
- Both Kobalte versions: capture layer eligibility, top-layer identity, and layer-stack membership generation at pointerdown. Successful additions and removals increment the generation, so opening and closing a temporary inner layer cannot revive an old gesture. The small internal `captureTouchOutside` hook does not replace Kobalte's exclusions, callbacks, cancelable event, or dismissal path.

The two self-contained gesture helpers are identical. Both JS and JSX Kobalte entry paths are patched. No public component implementation changed.

## Gesture contract

- Preserve the original pointerdown in the existing custom event detail.
- Require a primary, single touch with matching pointer/touch identities.
- Reject native prevention, cancellation, scroll, movement over 10 CSS pixels, and holds of 500ms or longer.
- Check both the completion hit and the current hit against the owner and its exclusions.
- Inspect final native cancellation in a **task**, after target/bubble dispatch.
- Let a matching compatibility click win. Otherwise wait 400ms after valid completion, based on upstream's documented approximately 350ms click delay.
- Emit once, including when the custom event is canceled.
- The native custom-event dispatcher returns its cancellation outcome to the helper. A canceled dismissal consumes the gesture once and installs no swallowing guard.
- Disposal/replacement clears pending listeners and timers. After an accepted fallback is consumed, a separate 400ms click-through guard survives layer disposal intentionally. It prevents a nearby late click only when its actual hit is outside both the original control subtree and completion-hit subtree. The original button and its children retain activation. It removes itself on a matching late click, the next pointerdown, or timeout, and cannot dispatch or close another layer.

The grace, movement threshold, hold threshold, and bounded late-click guard need upstream review before publishing a generally supported fix.

## Reproduce

Use Bun 1.4.2. Run each runtime in its own checkout, not by swapping the active shared development checkout's `node_modules`.

```sh
bun install --frozen-lockfile
bunx playwright install chromium webkit
bun run typecheck
bun run lint
bunx playwright test --grep 'completed outside touch|touch completion|native popover touch|volume popover supports|generic select|select scroll|device picker keeps' --workers=1
```

In the separate Solid 2 checkout, after its frozen install:

```sh
bun add --no-save solid-js@2.0.0-rc.13 @solidjs/web@2.0.0-rc.13 @solidjs/vite-plugin@3.0.0-next.47 vite@8.3.2
bunx tsc -p tsconfig.solid2.json --noEmit
bunx playwright test --config playwright.solid2.config.ts --grep 'completed outside touch|touch completion|native popover touch|volume popover supports|generic select|select scroll|device picker keeps' --workers=1
cd site
bun run search:index
bunx vite build
bunx playwright test e2e/mobile-select-scroll.spec.ts --workers=1
```

Ensure acceptance ports are free or use a separate temporary config with an unused port. Do not reuse unrelated servers. Linux additionally needs the Playwright browser system dependencies installed by its authorized CI runner.

## Evidence and remaining gates

Mac red/green evidence is retained under `artifacts/outside-touch-proof`. The gesture matrix captures timing, final prevention, custom-event counts, original pointer identity, focus, scroll, and callback/dismissal outcomes. The unchanged mobile spec retains exact scroll, anchor, navigation, focus, and outside-dismissal assertions.

### Correction round 17

Durable evidence is under `artifacts/outside-touch-proof/round17`:

- `red-solid1` and `red-solid2`: six expected failures per runtime against the previous patches, before dependency corrections. Both browsers lost original-button activation at 450ms and dismissed the outer layer after the temporary inner layer closed.
- `green-solid1-final` and `green-solid2-final`: 16 passed per runtime, including the original 12 contracts and four new browser-specific tests. Each runtime runs 11 Chromium tests (six default-browser contracts plus five explicit-browser tests) and five WebKit tests.
- `mobile-homepage-final`: two passed against a rebuilt production site. The existing native `tap(8, 600)` and exact scroll/anchor assertions are unchanged, with no supplemental click.
- `green-solid1-clean-focused`: six passed from a new checkout with no `node_modules`, using only `bun install --frozen-lockfile`. Solid 2 used a separate frozen-installed checkout and the pinned no-save overlay above. The shared checkout still uses Solid 1.9.15.
- `checks-final.log`: typecheck, lint, changed-file formatting, Solid 1 build, and diff check passed. Solid 2 typecheck, harness build, and site build also passed. Builds retain existing chunk-size/config-loader warnings.
- `format-full.log`: the full formatting check fails on the same nine unrelated `.factory/skills/shadcn` files, which were not edited.
- The earlier `green-solid1-focused` attempt failed before rendering because Bun patch preparation removed isolated dependency resolution. It is retained as an infrastructure failure, not counted as green evidence. The final frozen-installed runs supersede it. The initial lint failure was corrected before `checks-final.log`.

Patch sizes: Kobalte 0.13.14, 14,634 bytes (+186/-13); interaction, 8,742 bytes (+152/-8); Kobalte alpha, 3,966 bytes (+24/-0). Bun generated the patches via `bun patch` / `bun patch --commit`. Empty `.bun-tag` metadata hunks generated by repatching were removed; clean frozen application was then verified. Bun's preparation temporarily extracted the aliased packages into the root, losing isolated dependency resolution. Those generated copies were preserved in a temporary backup, and a frozen install restored the normal package symlinks. This is not a source or manifest workaround.

Still required:

1. Linux Chromium and WebKit runs, especially the unchanged native blank-tap reproduction from run `38014494116`, artifact `11655549909`.
2. Parent review of the dependency changes and late-click policy.
3. Physical Safari validation, if device certification is required.
4. Authorized upstream source changes and fixed releases, followed by fresh registry consumer validation **without inherited patches or aliases**.

## Portable delivery and upstream handoff

Registry `registry:file` entries can deliver patch files, but the checked shadcn schema has no supported `packageJson` metadata-merge field. Delivering `package.json` as a file would replace the consumer manifest, not safely merge patch metadata. Bun-only patch configuration also leaves npm/pnpm consumers unfixed. No acceptable portable route has been established. These patches are not release-ready, and **main must not merge on the strength of this local proof**.

For separately authorized upstream source work:

1. Port the completion helper and cancellation-result contract into Solid Primitives' interaction owner and Kobalte's stable bundled primitive. Preserve event names, original pointerdown details, callback order, exclusions, and pending cleanup.
2. Add membership generation to each Kobalte layer-stack owner and capture it alongside existing eligibility. Include the transient inner-open/Escape-close regression.
3. Keep the late original-action, child/parent activation, canceled-dismissal, and distinct exposed-target regressions in the owning upstream tests. Have upstream review timing thresholds and late-click policy.
4. Obtain actual fixed dependency releases, update registry dependencies, and validate fresh Solid 1/2 consumers using Bun, npm, and pnpm without inherited patches or acceptance aliases.

No upstream submission, publication, fork, or invented dependency version is part of this work. Parent review must happen again before any authorized publication.
