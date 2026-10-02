import * as Solid from "solid-js";

type Cleanup = void | (() => void);
type Solid1CreateEffect = (fn: () => void) => void;
type Solid2CreateEffect = <T>(
  compute: () => T,
  apply: (value: T) => Cleanup
) => void;

const hasTwoPhaseEffects = "onSettled" in Solid;

/**
 * Runs one reactive compute with an imperative apply phase.
 *
 * Solid 2 provides this contract directly. Solid 1 runs both phases inside
 * its single effect callback, so we register any returned cleanup on that
 * effect owner.
 */
export const createCompatEffect = <T>(
  compute: () => T,
  apply: (value: T) => Cleanup
): void => {
  if (hasTwoPhaseEffects) {
    (Solid.createEffect as unknown as Solid2CreateEffect)(compute, apply);
    return;
  }

  (Solid.createEffect as unknown as Solid1CreateEffect)(() => {
    const cleanup = apply(compute());
    if (cleanup) {
      Solid.onCleanup(cleanup);
    }
  });
};
