import adapters from "./content-adapters.json" with { type: "json" };

interface Prose {
  tag: string;
  text: string;
}

/** Exact source-backed replacements, never regexes or whole-route exclusions. */
export const adaptContent = (route: string, content: Prose[]): Prose[] => {
  const result = [...content];

  for (const adapter of adapters.filter((entry) => entry.route === route)) {
    const index = result.findIndex((_, start) =>
      adapter.upstream.every(
        (expected, offset) =>
          result[start + offset]?.tag === expected.tag &&
          result[start + offset]?.text === expected.text
      )
    );

    if (index < 0)
      throw new Error(`Stale prose adapter: ${route}: ${adapter.reason}`);
    result.splice(index, adapter.upstream.length, ...adapter.local);
  }

  return result;
};
