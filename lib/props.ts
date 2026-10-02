/**
 * Returns a reactive view of `props` without the listed keys.
 *
 * A proxy keeps Solid prop getters live instead of copying their current values.
 * This is intentionally renderer-agnostic so component source works in Solid 1
 * and Solid 2, whose public prop helper surfaces differ.
 */
export const omitProps = <
  T extends Record<PropertyKey, unknown>,
  K extends keyof T,
>(
  props: T,
  keys: readonly K[]
): Omit<T, K> => {
  const omitted = new Set<PropertyKey>(keys);

  return new Proxy({} as Omit<T, K>, {
    get: (_, key) => (omitted.has(key) ? undefined : props[key as keyof T]),
    has: (_, key) => !omitted.has(key) && key in props,
    ownKeys: () => Reflect.ownKeys(props).filter((key) => !omitted.has(key)),
    getOwnPropertyDescriptor: (_, key) => {
      if (omitted.has(key)) {
        return undefined;
      }

      const descriptor = Reflect.getOwnPropertyDescriptor(props, key);
      return descriptor
        ? { ...descriptor, configurable: true }
        : { configurable: true, enumerable: true };
    },
  });
};
