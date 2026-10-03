export interface MutableRef<T> {
  current: T;
}

export type RefTarget<T> =
  | ((value: T | null) => void)
  | { current: T | null }
  | RefTarget<T>[]
  | null
  | undefined;

/** Writes a DOM node or imperative handle to the ref shapes audiocn accepts. */
export const setRefValue = <T>(ref: RefTarget<T>, value: T | null): void => {
  if (!ref) {
    return;
  }

  if (Array.isArray(ref)) {
    for (const item of ref) {
      setRefValue(item, value);
    }

    return;
  }

  if ("current" in ref) {
    ref.current = value;

    return;
  }

  ref(value);
};
