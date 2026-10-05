import { expect, test } from "@playwright/test";

import { loadContributors } from "../lib/contributors";

interface ApiPerson {
  login: string;
  type: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

const person = (overrides: Partial<ApiPerson> = {}) => ({
  login: "port-author",
  type: "User",
  avatar_url: "https://avatars.githubusercontent.com/u/42?v=4",
  html_url: "https://github.com/port-author",
  contributions: 3,
  ...overrides,
});

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

  const results = await loadContributors(async () =>
    Response.json([...invalid, person()])
  );

  expect(results).toEqual([
    {
      login: "port-author",
      contributions: 3,
      profileUrl: "https://github.com/port-author",
      avatarUrl: "https://avatars.githubusercontent.com/u/42?s=96",
    },
  ]);
  await test.info().attach("validated-contributor-snapshot", {
    body: JSON.stringify(results),
    contentType: "application/json",
  });
});

test("contributor build falls back on unavailable, malformed and failed requests", async () => {
  expect(
    await loadContributors(async () => new Response(null, { status: 503 }))
  ).toEqual([]);
  expect(
    await loadContributors(async () =>
      Response.json({ error: "unexpected shape" })
    )
  ).toEqual([]);
  expect(await loadContributors(async () => new Response("not JSON"))).toEqual(
    []
  );
  expect(
    await loadContributors(async () => {
      throw new Error("request timed out");
    })
  ).toEqual([]);
  await loadContributors(async (url, options) => {
    expect(url).toBe(
      "https://api.github.com/repos/jhomra21/audiocn-solid/contributors?per_page=100"
    );
    expect(options?.redirect).toBe("error");
    expect(options?.signal).toBeInstanceOf(AbortSignal);

    return Response.json([]);
  });
});
