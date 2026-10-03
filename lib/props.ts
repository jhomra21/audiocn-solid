/**
 * Returns a reactive plain-object view of `props` without the listed keys.
 *
 * Solid 2 marks its props objects with internal symbols. A Proxy forwards
 * those symbols and lets DOM spread unwrap the original props, which leaks
 * component-only fields as attributes. Copying only string keys as getters
 * keeps values live without carrying framework internals across the boundary.
 */
export const omitProps = <T extends object, K extends keyof T>(
  props: T,
  keys: readonly K[]
): Omit<T, K> => {
  const omitted = new Set<PropertyKey>(keys);
  const rest = {} as Omit<T, K>;

  for (const key of Reflect.ownKeys(props)) {
    if (typeof key === "symbol" || omitted.has(key)) {
      continue;
    }

    Object.defineProperty(rest, key, {
      configurable: true,
      enumerable: true,
      get: () => Reflect.get(props, key),
    });
  }

  return rest;
};
