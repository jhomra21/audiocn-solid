import { siteConfig } from "./site";

// Twice the rendered avatar size, so retina screens stay sharp without pulling
// full-resolution avatars for every contributor.
const AVATAR_REQUEST_SIZE = "96";

const REPOSITORY_NAME = /^[\w.-]+\/[\w.-]+$/u;

export interface Contributor {
  login: string;
  avatarUrl: string;
  profileUrl: string;
  contributions: number;
}

export interface ContributorStats {
  totalContributions: number;
  totalContributors: number;
}

export interface ContributorsEnvironment {
  /** Raises the rate limit, and reads the list while the repository is private. */
  GITHUB_TOKEN?: string;
  /** Lists another public repository, in `owner/repo` form. */
  AUDIOCN_GITHUB_REPOSITORY?: string;
  readonly [key: string]: string | undefined;
}

export type FetchImplementation = (
  input: string,
  init?: RequestInit
) => Promise<Response>;

/** The configured repository when it is a valid `owner/repo`, else the site's. */
export const resolveContributorsRepository = (
  environment: ContributorsEnvironment = process.env
): string => {
  const configured = environment.AUDIOCN_GITHUB_REPOSITORY?.trim();

  return configured && REPOSITORY_NAME.test(configured)
    ? configured
    : siteConfig.githubRepo;
};

export const getContributorStats = (
  contributors: readonly Contributor[]
): ContributorStats => ({
  totalContributions: contributors.reduce(
    (total, contributor) => total + contributor.contributions,
    0
  ),
  totalContributors: contributors.length,
});

const safeUrl = (
  value: unknown,
  host: string,
  pathname: string
): value is string => {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.host === host &&
      pathname === url.pathname
    );
  } catch {
    return false;
  }
};

interface ApiContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

const isApiContributor = (entry: unknown): entry is ApiContributor => {
  if (
    typeof entry !== "object" ||
    entry === null ||
    !("login" in entry) ||
    !("type" in entry) ||
    !("avatar_url" in entry) ||
    !("html_url" in entry) ||
    !("contributions" in entry)
  )
    return false;

  return (
    typeof entry.login === "string" &&
    /^[\w-]+$/.test(entry.login) &&
    entry.type !== "Bot" &&
    typeof entry.contributions === "number" &&
    Number.isSafeInteger(entry.contributions) &&
    entry.contributions > 0 &&
    safeUrl(entry.html_url, "github.com", `/${entry.login}`) &&
    typeof entry.avatar_url === "string" &&
    URL.canParse(entry.avatar_url)
  );
};

export const loadContributors = async (
  request: FetchImplementation = fetch,
  environment: ContributorsEnvironment = process.env
): Promise<Contributor[]> => {
  try {
    const headers = new Headers({
      Accept: "application/vnd.github+json",
      "User-Agent": siteConfig.name,
      "X-GitHub-Api-Version": "2022-11-28",
    });

    if (environment.GITHUB_TOKEN) {
      headers.set("Authorization", `Bearer ${environment.GITHUB_TOKEN}`);
    }

    const response = await request(
      `https://api.github.com/repos/${resolveContributorsRepository(environment)}/contributors?per_page=100`,
      {
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!response.ok) return [];
    const payload: unknown = await response.json();

    if (!Array.isArray(payload)) return [];
    const contributors: Contributor[] = [];

    for (const entry of payload) {
      if (!isApiContributor(entry)) continue;

      const {
        login,
        avatar_url: avatarUrl,
        html_url: profileUrl,
        contributions,
      } = entry;

      const avatar = new URL(avatarUrl);

      if (
        avatar.protocol !== "https:" ||
        avatar.username ||
        avatar.password ||
        avatar.host !== "avatars.githubusercontent.com" ||
        !/^\/u\/\d+$/.test(avatar.pathname)
      )
        continue;
      avatar.searchParams.set("s", AVATAR_REQUEST_SIZE);
      avatar.hash = "";
      contributors.push({
        login,
        contributions,
        profileUrl,
        avatarUrl: avatar.href,
      });
    }

    return contributors.sort(
      (a, b) =>
        b.contributions - a.contributions || a.login.localeCompare(b.login)
    );
  } catch {
    return [];
  }
};
