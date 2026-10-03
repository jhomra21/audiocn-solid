import * as Solid from "solid-js";

type Cleanup = void | (() => void);

type Solid1CreateEffect = (fn: () => void) => void;

type Solid2CreateEffect = <T>(
  compute: () => T,
  apply: (value: T) => Cleanup
) => void;

const hasTwoPhaseEffects = "onSettled" in Solid;

// SAFETY: the runtime feature check below selects the matching call contract.
const createEffect = Solid.createEffect as Solid1CreateEffect & Solid2CreateEffect;

/**
 * Runs a tracked compute phase followed by an untracked imperative apply phase.
 *
 * Solid 2 provides this contract directly. Solid 1 needs `untrack` around the
 * apply callback so reads performed by painters, DOM writers, and subscriptions
 * do not become accidental effect dependencies.
 */
export const createCompatEffect = <T>(
  compute: () => T,
  apply: (value: T) => Cleanup
): void => {
  if (hasTwoPhaseEffects) {
    createEffect(
      compute,
      (value) => Solid.untrack(() => apply(value))
    );

    return;
  }

  createEffect(() => {
    const value = compute();
    const cleanup = Solid.untrack(() => apply(value));

    if (cleanup) {
      Solid.onCleanup(cleanup);
    }
  });
};
