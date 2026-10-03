/**
 * Copies enumerable string props as live getters without carrying framework
 * symbols across a DOM boundary.
 */
export const forwardProps = (
  target: object,
  source: object,
  omitted: ReadonlySet<PropertyKey> = new Set()
): void => {
  // SAFETY: Object.keys only returns enumerable string keys, so this view
  // cannot expose Solid's internal symbol markers.
  const readable = source as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    if (omitted.has(key)) {
      continue;
    }

    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      get: () => readable[key],
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
export const omitProps = <T extends object, K extends keyof T>(
  props: T,
  keys: readonly K[]
): Omit<T, K> => {
  const omitted = new Set<PropertyKey>(keys);
  const rest = {} as Omit<T, K>;

  forwardProps(rest, props, omitted);

  return rest;
};
