import { siteConfig } from "./site";

export interface Contributor {
  login: string;
  avatarUrl: string;
  profileUrl: string;
  contributions: number;
}

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
  request: typeof fetch = fetch
): Promise<Contributor[]> => {
  try {
    const response = await request(
      `https://api.github.com/repos/${siteConfig.githubRepo}/contributors?per_page=100`,
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
      avatar.search = "?s=96";
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
