import * as Solid from "solid-js";

type Cleanup = void | (() => void);

const hasTwoPhaseEffects = "onSettled" in Solid;

function invokeEffect(fn: () => void): void;
function invokeEffect<T>(
  compute: () => T,
  apply: (value: T) => Cleanup
): void;
function invokeEffect<T>(
  compute: () => T,
  apply?: (value: T) => Cleanup
): void {
  if (apply) {
    Function.prototype.call.call(Solid.createEffect, undefined, compute, apply);

    return;
  }

  Function.prototype.call.call(Solid.createEffect, undefined, compute);
}

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
    invokeEffect(
      compute,
      (value) => Solid.untrack(() => apply(value))
    );

    return;
  }

  invokeEffect(() => {
    const value = compute();
    const cleanup = Solid.untrack(() => apply(value));

    if (cleanup) {
      Solid.onCleanup(cleanup);
    }
  });
};
