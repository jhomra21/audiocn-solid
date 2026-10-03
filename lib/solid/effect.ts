import * as Solid from "solid-js";

type Cleanup = void | (() => void);

type EffectPayload<T> = () => T;

const hasTwoPhaseEffects = "onSettled" in Solid;

/**
 * Runs a tracked compute phase followed by an untracked imperative apply phase.
 *
 * Both Solid versions accept this two-argument call. Solid 1 treats the second
 * function as the initial previous value, while Solid 2 treats it as the apply
 * phase. Solid 1 therefore applies inside the tracked callback after compute;
 * Solid 2 applies through its native second phase.
 */
export const createCompatEffect = <T>(
  compute: () => T,
  apply: (value: T) => Cleanup
): void => {
  const computePayload = (): EffectPayload<T> => {
    const value = compute();

    if (!hasTwoPhaseEffects) {
      const cleanup = Solid.untrack(() => apply(value));

      if (cleanup) {
        Solid.onCleanup(cleanup);
      }
    }

    return () => value;
  };

  const applyPayload = (payload: EffectPayload<T>): Cleanup =>
    Solid.untrack(() => apply(payload()));

  Solid.createEffect(computePayload, applyPayload);
};
