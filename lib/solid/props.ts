/**
 * Copies enumerable string props as live getters without carrying framework
 * symbols across a DOM boundary.
 */
export const forwardProps = <Target extends {}, Source extends {}>(
  target: Target,
  source: Source,
  omitted: ReadonlySet<PropertyKey> = new Set()
): void => {
  for (const key of Object.keys(source)) {
    if (omitted.has(key)) {
      continue;
    }

    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      get: () => {
        // SAFETY: Object.keys only returns own string keys that exist on Source.
        return source[key as keyof Source];
      },
    });
  }
};

/**
 * Returns a reactive plain-object view of `props` without the listed keys.
 *
 * Solid 2 marks its props objects with internal symbols. A Proxy forwards
 * those symbols and lets DOM spread unwrap the original props, which leaks
 * component-only fields as attributes. Copying only string keys as getters
 * keeps values live without carrying framework internals across the boundary.
 */
export const omitProps = <T extends {}, K extends keyof T>(
  props: T,
  keys: readonly K[]
): Omit<T, K> => {
  const omitted = new Set<PropertyKey>(keys);

  // SAFETY: forwardProps writes only T keys not present in the omitted set.
  const rest = {} as Omit<T, K>;

  forwardProps(rest, props, omitted);

  return rest;
};
