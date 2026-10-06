import { expect, test } from "@playwright/test";

import {
  getContributorStats,
  loadContributors,
  resolveContributorsRepository,
} from "../lib/contributors";
import type { Contributor } from "../lib/contributors";
import { siteConfig } from "../lib/site";

interface ApiPerson {
  login: string;
  type: string;
  avatar_url: string;
  html_url: string;
  contributions: number | string;
}

const CONTRIBUTORS_URL = `https://api.github.com/repos/${siteConfig.githubRepo}/contributors?per_page=100`;

const person = (overrides: Partial<ApiPerson> = {}) => ({
  login: "port-author",
  type: "User",
  avatar_url: "https://avatars.githubusercontent.com/u/42?v=4",
  html_url: "https://github.com/port-author",
  contributions: 3,
  ...overrides,
});

type ApiPayload =
  | readonly (Partial<ApiPerson> | string | null)[]
  | Readonly<Record<string, string>>;

const respondWith = (payload: ApiPayload) => async () => Response.json(payload);

test("contributor build validates response shape, bots, counts and external URLs", async () => {
  const invalid = [
    null,
    person({ type: "Bot" }),
    person({ login: "bad/login" }),
    person({ contributions: -1 }),
    person({ contributions: 1.5 }),
    person({ html_url: "https://github.com.evil.test/port-author" }),
    person({ html_url: "https://user:pass@github.com/port-author" }),
    person({ html_url: "https://github.com/port-author?redirect=evil" }),
    person({ avatar_url: "https://evil.test/u/42" }),
    person({
      avatar_url: "https://user:pass@avatars.githubusercontent.com/u/42",
    }),
    person({ avatar_url: "https://avatars.githubusercontent.com/not-a-user" }),
    person({ avatar_url: "not a url" }),
  ];

  const results = await loadContributors(
    respondWith([...invalid, person()]),
    {}
  );

  expect(results).toEqual([
    {
      login: "port-author",
      contributions: 3,
      profileUrl: "https://github.com/port-author",
      avatarUrl: "https://avatars.githubusercontent.com/u/42?v=4&s=96",
    },
  ]);
  await test.info().attach("validated-contributor-snapshot", {
    body: JSON.stringify(results),
    contentType: "application/json",
  });
});

test("contributor build drops each unusable entry on its own", async () => {
  const unusable = [
    ["a bot account", person({ type: "Bot" })],
    ["a zero-contribution entry", person({ contributions: 0 })],
    ["a non-numeric contribution count", person({ contributions: "12" })],
    [
      "an off-host avatar",
      person({ avatar_url: "https://example.com/u/1.png" }),
    ],
    [
      "an unexpected avatar path",
      person({ avatar_url: "https://avatars.githubusercontent.com/in/1?v=4" }),
    ],
    [
      "an off-host profile link",
      person({ html_url: "https://example.com/port-author" }),
    ],
    [
      "a profile link for another account",
      person({ html_url: "https://github.com/someone-else" }),
    ],
    ["a malformed entry", { login: "port-author" }],
    ["a non-object entry", "port-author"],
  ] as const;

  for (const [name, entry] of unusable) {
    expect(await loadContributors(respondWith([entry]), {}), name).toEqual([]);
  }
});

test("contributor build falls back on unavailable, malformed and failed requests", async () => {
  expect(
    await loadContributors(async () => new Response(null, { status: 503 }), {})
  ).toEqual([]);
  expect(
    await loadContributors(async () => new Response(null, { status: 404 }), {})
  ).toEqual([]);
  expect(
    await loadContributors(
      respondWith({ error: "unexpected shape", message: "Not Found" }),
      {}
    )
  ).toEqual([]);
  expect(
    await loadContributors(async () => new Response("not JSON"), {})
  ).toEqual([]);
  expect(
    await loadContributors(async () => {
      throw new Error("request timed out");
    }, {})
  ).toEqual([]);
  expect(
    await loadContributors(
      () => Promise.reject(new Error("network unreachable")),
      {}
    )
  ).toEqual([]);
  await loadContributors(async (url, options) => {
    expect(url).toBe(CONTRIBUTORS_URL);
    expect(options?.redirect).toBe("error");
    expect(options?.signal).toBeInstanceOf(AbortSignal);

    return Response.json([]);
  }, {});
});

test("contributor build resolves the repository from the environment", () => {
  expect(resolveContributorsRepository({})).toBe(siteConfig.githubRepo);
  expect(
    resolveContributorsRepository({ AUDIOCN_GITHUB_REPOSITORY: "shadcn-ui/ui" })
  ).toBe("shadcn-ui/ui");
  expect(
    resolveContributorsRepository({
      AUDIOCN_GITHUB_REPOSITORY: "https://github.com/shadcn-ui/ui",
    })
  ).toBe(siteConfig.githubRepo);
});

test("contributor requests are anonymous unless a token is configured", async () => {
  const requests: { headers: Headers; url: string }[] = [];

  const record = async (url: string, options?: RequestInit) => {
    requests.push({ headers: new Headers(options?.headers), url });

    return Response.json([person()]);
  };

  await loadContributors(record, {});
  await loadContributors(record, { GITHUB_TOKEN: "token-value" });
  await loadContributors(record, { AUDIOCN_GITHUB_REPOSITORY: "shadcn-ui/ui" });

  expect(requests.map(({ url }) => url)).toEqual([
    CONTRIBUTORS_URL,
    CONTRIBUTORS_URL,
    "https://api.github.com/repos/shadcn-ui/ui/contributors?per_page=100",
  ]);
  expect(requests[0]?.headers.has("authorization")).toBe(false);
  expect(requests[1]?.headers.get("authorization")).toBe("Bearer token-value");
  expect(requests[2]?.headers.has("authorization")).toBe(false);
});

test("contributor avatars are requested at the rendered size", async () => {
  const [contributor] = await loadContributors(
    respondWith([
      person({
        avatar_url: "https://avatars.githubusercontent.com/u/7?v=4&s=460",
      }),
    ]),
    {}
  );

  expect(contributor?.avatarUrl).toBe(
    "https://avatars.githubusercontent.com/u/7?v=4&s=96"
  );
});

test("contributors rank by contributions, then login", async () => {
  const contributors = await loadContributors(
    respondWith([
      person({
        contributions: 3,
        html_url: "https://github.com/zara",
        login: "zara",
      }),
      person({
        contributions: 9,
        html_url: "https://github.com/thrall",
        login: "thrall",
      }),
      person({
        contributions: 3,
        html_url: "https://github.com/anduin",
        login: "anduin",
      }),
    ]),
    {}
  );

  expect(contributors.map(({ login }) => login)).toEqual([
    "thrall",
    "anduin",
    "zara",
  ]);
});

test("contributor stats total people and contributions", () => {
  const contributors: Contributor[] = [
    {
      avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4&s=96",
      contributions: 40,
      login: "thrall",
      profileUrl: "https://github.com/thrall",
    },
    {
      avatarUrl: "https://avatars.githubusercontent.com/u/2?v=4&s=96",
      contributions: 2,
      login: "zara",
      profileUrl: "https://github.com/zara",
    },
  ];

  expect(getContributorStats(contributors)).toEqual({
    totalContributions: 42,
    totalContributors: 2,
  });
  expect(getContributorStats([])).toEqual({
    totalContributions: 0,
    totalContributors: 0,
  });
});
