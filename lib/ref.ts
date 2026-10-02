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
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  if (Array.isArray(ref)) {
    for (const item of ref) {
      setRefValue(item, value);
    }
    return;
  }
  ref.current = value;
};
