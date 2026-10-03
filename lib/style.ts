export type StyleObject = Record<string, string | number | undefined>;

export type StyleValue = string | StyleObject;

/** Prepends component CSS variables while preserving user style precedence. */
export const mergeStyleVars = (
  style: StyleValue | undefined,
  vars: StyleObject
): StyleValue => {
  if (style === undefined) {
    return vars;
  }

  if (style instanceof Object) {
    return { ...vars, ...style };
  }

  const prefix = Object.entries(vars)
    .filter(([, value]) => value !== undefined)
    .map(([property, value]) => `${property}:${String(value)};`)
    .join("");

  return `${prefix}${style}`;
};
