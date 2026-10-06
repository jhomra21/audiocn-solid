import type { FetchImplementation } from "./contributors";
import { siteConfig } from "./site";

interface ApiRepository {
  stargazers_count: number;
}

const isApiRepository = (payload: unknown): payload is ApiRepository =>
  typeof payload === "object" &&
  payload !== null &&
  "stargazers_count" in payload &&
  typeof payload.stargazers_count === "number" &&
  Number.isSafeInteger(payload.stargazers_count) &&
  payload.stargazers_count >= 0;

/** Resolves `undefined` unless GitHub answers with a usable count. */
export const loadStargazersCount = async (
  request: FetchImplementation = fetch
): Promise<number | undefined> => {
  try {
    const response = await request(
      `https://api.github.com/repos/${siteConfig.githubRepo}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": siteConfig.name,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        redirect: "error",
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!response.ok) return undefined;
    const payload: unknown = await response.json();

    return isApiRepository(payload) ? payload.stargazers_count : undefined;
  } catch {
    return undefined;
  }
};
