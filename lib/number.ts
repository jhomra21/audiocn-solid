export const roundValue = (value: number): number =>
  Math.round(value * 1e6) / 1e6;

export const widestFormattedValue = <T>(
  samples: Iterable<T>,
  format: (value: T) => string
): number => {
  let widest = 0;

  for (const value of samples) {
    widest = Math.max(widest, format(value).length);
  }

  return widest;
};
