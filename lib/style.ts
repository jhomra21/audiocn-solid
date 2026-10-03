export type StyleObject = Record<string, string | number | undefined>;

export type StyleValue = string | StyleObject;

const isStyleString = (style: StyleValue): style is string =>
  typeof style === "string";

/** Prepends component CSS variables while preserving user style precedence. */
export const mergeStyleVars = (
  style: StyleValue | undefined,
  vars: StyleObject
): StyleValue => {
  if (style === undefined) {
    return vars;
  }

  if (!isStyleString(style)) {
    return { ...vars, ...style };
  }

  let prefix = "";

  for (const [property, value] of Object.entries(vars)) {
    if (value !== undefined) {
      prefix += `${property}:${String(value)};`;
    }
  }

  return `${prefix}${style}`;
};
